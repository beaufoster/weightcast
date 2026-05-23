import { Unit } from '@/types'
import { actLabels } from '@/utils/calculator'

export interface DietFormState { cal: number; act: number }
interface Result { tdee: number; exPerDay: number; deficit: number }

interface Props {
  form: DietFormState
  result: Result
  unit: Unit
  onFormChange: (p: Partial<DietFormState>) => void
}

function fmt(n: number) { return Math.round(n).toLocaleString() }

export function DietCard({ form, result, onFormChange }: Props) {
  return (
    <div className="card">
      <div className="card-title"><div className="ico">🥗</div> Daily Calories</div>
      <div className="banner info">
        <span className="bico">ℹ️</span>
        <div><strong>Your estimated daily burn: <span id="tdee-disp">{fmt(result.tdee)} cal</span></strong>Based on your weight, age, and activity level.</div>
      </div>

      <div className="slider-row">
        <div className="slider-label-row">
          <label>Calorie Target</label>
          <span className="slider-val"><span id="cal-v">{fmt(form.cal)}</span> cal/day</span>
        </div>
        <input type="range" id="calSl" min="1000" max="3500" step="50" value={form.cal}
          onChange={e => onFormChange({ cal: parseInt(e.target.value) })} />
        {form.cal < 1200 && (
          <div className="banner warn" id="cal-warn" style={{ marginTop: 8 }}>
            <span className="bico">⚠️</span>
            <div>Below 1,200 cal/day isn't safe for most people. We cap the deficit at 1,200.</div>
          </div>
        )}
      </div>

      <div className="slider-row">
        <div className="slider-label-row">
          <label>Activity Level</label>
          <span className="slider-val" id="act-v">{actLabels[form.act - 1]}</span>
        </div>
        <input type="range" id="actSl" min="1" max="4" step="1" value={form.act}
          onChange={e => onFormChange({ act: parseInt(e.target.value) })} />
      </div>

      <div className="calorie-breakdown" id="calorie-breakdown">
        <div className="cb-row"><span>Base burn (TDEE)</span><span id="cb-tdee">{fmt(result.tdee)} cal</span></div>
        <div className="cb-row"><span>Exercise bonus</span><span id="cb-ex">+{fmt(result.exPerDay)} cal</span></div>
        <div className="cb-row"><span>Calorie intake</span><span id="cb-in">−{fmt(Math.max(form.cal, 1200))} cal</span></div>
        <div className="cb-row total"><span>Daily deficit</span><span id="cb-def">{fmt(result.deficit)} cal</span></div>
      </div>
    </div>
  )
}
