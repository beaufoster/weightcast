import { Checkin, Plan, Unit } from '@/types'
import { fmtWt } from '@/utils/calculator'

interface Props { plan: Plan | null; checkins: Checkin[]; unit: Unit }

export function ProgressSnapshot({ plan, checkins, unit }: Props) {
  if (!plan) return null
  const latest = checkins[checkins.length - 1]
  const startWt  = plan.cw
  const currentWt = latest?.weight ?? plan.cw
  const lost     = +(startWt - currentWt).toFixed(1)
  const remain   = +(currentWt - plan.gw).toFixed(1)

  return (
    <div className="card ps-card">
      <div className="ps-row">
        <div className="ps-stat">
          <div className="ps-val" id="ps-start">{fmtWt(startWt, unit)}</div>
          <div className="ps-lbl">Started</div>
        </div>
        <div className="ps-stat">
          <div className="ps-val" id="ps-current">{fmtWt(currentWt, unit)}</div>
          <div className="ps-lbl">Current</div>
        </div>
        <div className="ps-stat">
          <div className="ps-val" id="ps-lost">{lost > 0 ? '-' : '+'}{fmtWt(Math.abs(lost), unit)}</div>
          <div className="ps-lbl">Lost</div>
        </div>
        <div className="ps-stat">
          <div className="ps-val" id="ps-remain">{remain > 0 ? fmtWt(remain, unit) : '🎯'}</div>
          <div className="ps-lbl">To Go</div>
        </div>
      </div>
    </div>
  )
}
