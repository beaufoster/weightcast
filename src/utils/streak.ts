import { Checkin } from '@/types'
import { addWeeks } from './calculator'
import { linearRegression } from './regression'

export function calcStreakFromEntries(checkins: Checkin[]): number {
  if (!checkins.length) return 0
  const sorted = [...checkins].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const d1 = new Date(sorted[i - 1].date + 'T12:00')
    const d2 = new Date(sorted[i].date + 'T12:00')
    const diff = (d1.getTime() - d2.getTime()) / (7 * 24 * 3600 * 1000)
    if (diff >= 0.5 && diff <= 1.8) streak++
    else break
  }
  const lastDate = new Date(sorted[0].date + 'T12:00')
  const daysSince = (Date.now() - lastDate.getTime()) / (24 * 3600 * 1000)
  if (daysSince > 10) return 0
  return streak
}

export function calcTrendFromEntries(checkins: Checkin[], goalWt: number | null) {
  if (checkins.length < 3) return null
  const sorted = [...checkins].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const origin = new Date(sorted[0].date + 'T12:00')
  const pts = sorted.map(ci => {
    const d = new Date(ci.date + 'T12:00')
    return { x: (d.getTime() - origin.getTime()) / (7 * 24 * 3600 * 1000), y: ci.weight }
  })
  const reg = linearRegression(pts)
  if (!reg) return null
  const { slope, intercept } = reg
  const n = pts.length
  let weeksToGoal: number | null = null
  let projGoalDate: Date | null = null
  if (goalWt !== null && slope < -0.01) {
    const weeksFromOriginToGoal = (goalWt - intercept) / slope
    const weeksFromNow = weeksFromOriginToGoal - pts[n - 1].x
    if (weeksFromNow > 0 && weeksFromNow < 520) {
      weeksToGoal = Math.round(weeksFromNow)
      projGoalDate = addWeeks(new Date(), weeksFromNow)
    }
  }
  return { slope, weeksToGoal, projGoalDate, goalWt, n }
}
