import { Pace, Unit } from '@/types'

const paceDescLbs: Record<Pace, string> = {
  gentle:     '≤0.5 lb/wk',
  steady:     '0.5–1 lb/wk',
  aggressive: '1–2 lb/wk',
}
const paceDescKg: Record<Pace, string> = {
  gentle:     '≤0.25 kg/wk',
  steady:     '0.25–0.5 kg/wk',
  aggressive: '0.5–0.9 kg/wk',
}

interface Props { pace: Pace; unit: Unit; onPaceChange: (p: Pace) => void }

export function PaceCard({ pace, unit, onPaceChange }: Props) {
  const descs = unit === 'kg' ? paceDescKg : paceDescLbs
  return (
    <div className="card">
      <div className="card-title"><div className="ico">⚡</div> Pace</div>
      <div className="scap-row">
        {(['gentle', 'steady', 'aggressive'] as Pace[]).map(p => (
          <button key={p} id={`sc-${p}`} className={`scap-btn pace-btn${pace === p ? ' active' : ''}`}
            onClick={() => onPaceChange(p)}>
            <span className="pico">{p === 'gentle' ? '🐢' : p === 'steady' ? '🚶' : '🔥'}</span>
            <span className="pname">{p.charAt(0).toUpperCase() + p.slice(1)}</span>
            <span className={`sc-desc pdesc`}>{descs[p]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
