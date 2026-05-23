import { Pace, SimWeek } from '@/types'

export const KG_TO_LBS = 2.20462

export function calcBMR(wt: number, ht: number, age: number, sex: 'male' | 'female'): number {
  const kg = wt * 0.453592, cm = ht * 2.54
  return sex === 'male'
    ? 10 * kg + 6.25 * cm - 5 * age + 5
    : 10 * kg + 6.25 * cm - 5 * age - 161
}

export function simulateLoss(
  startWt: number, goalWt: number, calIntake: number,
  exPerDay: number, actMult: number, age: number,
  ht: number, sex: 'male' | 'female', maxLbs: number
): SimWeek[] {
  const weeks: SimWeek[] = []
  let wt = startWt, w = 0
  while (wt > goalWt + 0.05 && w < 520) {
    const bmr = calcBMR(wt, ht, age, sex)
    const tdee = bmr * actMult + exPerDay
    const safe = Math.max(calIntake, 1200)
    const def = Math.min(Math.max(tdee - safe, 0), maxLbs * 3500 / 7)
    const lb = Math.min((def * 7) / 3500, wt - goalWt)
    wt = Math.max(wt - lb, goalWt)
    weeks.push({ week: w + 1, weight: +wt.toFixed(1) })
    w++
  }
  return weeks
}

export function addWeeks(d: Date, w: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + Math.round(w * 7))
  return x
}

export const paceConfigs: Record<Pace, { max: number; label: string; desc: string }> = {
  gentle:     { max: 0.5, label: 'Gentle',     desc: '≤ 0.5 lb/wk. Great for long-term habits.' },
  steady:     { max: 1.0, label: 'Steady',     desc: '0.5–1 lb/wk. Sustainable and muscle-preserving.' },
  aggressive: { max: 2.0, label: 'Aggressive', desc: '1–2 lb/wk. 2 lb/wk is the safe maximum.' },
}

export const actLabels = ['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active']
export const actMults  = [1.2, 1.375, 1.55, 1.725]

export function toLbs(v: number, unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? v * KG_TO_LBS : v
}
export function fromLbs(v: number, unit: 'lbs' | 'kg'): number {
  return unit === 'kg' ? v / KG_TO_LBS : v
}
export function fmtWt(lbs: number, unit: 'lbs' | 'kg', d = 1): string {
  return fromLbs(lbs, unit).toFixed(d) + ' ' + unit
}
export function fmtD(n: number, d = 1): string {
  return (+n).toFixed(d)
}
export function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
export function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
