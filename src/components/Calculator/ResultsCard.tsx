import { Checkin, CalcMode, Plan, Unit } from '@/types'
import { fmtDate, fmtWt } from '@/utils/calculator'
import { calcTrendFromEntries } from '@/utils/streak'

interface Result {
  weeks: number | null; projDate: Date | null; projWt: number | null
  avgRate: number | null; totalLoss: number; deficit: number; error: string | null
}

interface Props { result: Result; calcMode: CalcMode; unit: Unit; plan: Plan | null; checkins: Checkin[] }

function fmt(n: number) { return Math.round(n).toLocaleString() }

export function ResultsCard({ result, calcMode, unit, plan, checkins }: Props) {
  const trend = calcTrendFromEntries(checkins, plan?.gw ?? null)

  return (
    <div className="card results-card">
      <div className="card-title"><div className="ico">📊</div> Your Projection</div>

      <div className="results-grid">
        <div className="result-box">
          <div className="result-val" id="r-weeks">
            {result.error === 'Pick a date' ? '—'
              : result.error === 'Pick a future date' ? '😅'
              : result.error === 'Increase deficit' ? '∞'
              : result.weeks === 0 ? '🎉'
              : calcMode === 'date' && result.projWt != null ? fmtWt(result.projWt, unit)
              : (result.weeks ?? '—')}
          </div>
          <div className="result-lbl" id="r-weeks-lbl">
            {result.error === 'Pick a date' ? 'Pick a date'
              : result.error === 'Pick a future date' ? 'Pick a future date'
              : result.error === 'Increase deficit' ? 'Increase deficit'
              : result.weeks === 0 ? 'Already there!'
              : calcMode === 'date' && result.weeks != null ? `in ${result.weeks} wks`
              : result.weeks != null ? `weeks (~${Math.ceil(result.weeks / 4.33)} mo)` : '—'}
          </div>
        </div>
        <div className="result-box">
          <div className="result-val" id="r-date">
            {result.projDate && !result.error ? fmtDate(result.projDate) : '—'}
          </div>
          <div className="result-lbl">Goal Date</div>
        </div>
        <div className="result-box">
          <div className="result-val" id="r-loss">
            {result.totalLoss > 0 ? fmtWt(result.totalLoss, unit) : '—'}
          </div>
          <div className="result-lbl">Total Loss</div>
        </div>
        <div className="result-box">
          <div className="result-val" id="r-rate">
            {result.avgRate != null && result.avgRate > 0 ? `${fmtWt(result.avgRate, unit, 2)}/wk avg` : '—'}
          </div>
          <div className="result-lbl">Avg Rate</div>
        </div>
      </div>

      <div className="deficit-summary">
        Daily deficit: <strong><span id="r-deficit">{fmt(result.deficit)}</span> cal</strong>
      </div>

      {trend && trend.weeksToGoal != null && (
        <div className="trend-card">
          <div className="trend-ico">📈</div>
          <div className="trend-text">
            <strong>On track</strong> — at your real-world pace, you'll hit your goal in ~{trend.weeksToGoal} weeks
            {trend.projGoalDate ? ` (${fmtDate(trend.projGoalDate)})` : ''}.
          </div>
        </div>
      )}
    </div>
  )
}
