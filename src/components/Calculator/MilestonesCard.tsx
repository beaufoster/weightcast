import { Checkin, Plan, Unit } from '@/types'
import { fmtWt } from '@/utils/calculator'

interface Props { plan: Plan; unit: Unit; checkins: Checkin[] }

interface Milestone { pct: number; label: string; emoji: string }

export function MilestonesCard({ plan, unit, checkins }: Props) {
  const totalLoss = plan.cw - plan.gw
  if (totalLoss <= 0) return null

  const milestones: Milestone[] = [
    { pct: 25, label: '25%', emoji: '🌱' },
    { pct: 50, label: 'Halfway', emoji: '🏅' },
    { pct: 75, label: '75%', emoji: '⭐' },
    { pct: 100, label: 'Goal!', emoji: '🏆' },
  ]

  const latestWeight = checkins.length
    ? [...checkins].sort((a, b) => b.date.localeCompare(a.date))[0].weight
    : plan.cw
  const lostSoFar = Math.max(plan.cw - latestWeight, 0)

  return (
    <div className="card milestones-card">
      <div className="card-title"><div className="ico">🏅</div> Milestones</div>
      <div className="milestones-list">
        {milestones.map(m => {
          const targetLoss = totalLoss * (m.pct / 100)
          const targetWt   = plan.cw - targetLoss
          const done       = lostSoFar >= targetLoss
          return (
            <div key={m.pct} className={`milestone-row${done ? ' done' : ''}`}>
              <span className="milestone-emoji">{done ? '✅' : m.emoji}</span>
              <span className="milestone-label">{m.label} — {fmtWt(targetWt, unit)}</span>
              <span className="milestone-loss">−{fmtWt(targetLoss, unit)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
