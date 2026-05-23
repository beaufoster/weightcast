export interface ExFormState { walk: number; lift: number; cardio: number }
interface Result { exPerDay: number }
interface Props {
  form: ExFormState
  result: Result
  onFormChange: (p: Partial<ExFormState>) => void
}

function fmt(n: number) { return Math.round(n).toLocaleString() }

export function ExerciseCard({ form, result, onFormChange }: Props) {
  return (
    <div className="card">
      <div className="card-title"><div className="ico">🏃</div> Exercise</div>
      <div className="slider-row">
        <div className="slider-label-row">
          <label>Daily Walking</label>
          <span className="slider-val"><span id="walk-v">{form.walk}</span> min/day</span>
        </div>
        <input type="range" id="walkSl" min="0" max="120" step="5" value={form.walk}
          onChange={e => onFormChange({ walk: parseInt(e.target.value) })} />
      </div>
      <div className="slider-row">
        <div className="slider-label-row">
          <label>Strength Training</label>
          <span className="slider-val"><span id="lift-v">{form.lift}</span> days/wk</span>
        </div>
        <input type="range" id="liftSl" min="0" max="6" step="1" value={form.lift}
          onChange={e => onFormChange({ lift: parseInt(e.target.value) })} />
      </div>
      <div className="slider-row">
        <div className="slider-label-row">
          <label>Cardio Sessions</label>
          <span className="slider-val"><span id="cardio-v">{form.cardio}</span> days/wk</span>
        </div>
        <input type="range" id="cardioSl" min="0" max="6" step="1" value={form.cardio}
          onChange={e => onFormChange({ cardio: parseInt(e.target.value) })} />
      </div>
      <div className="ex-burn-summary">
        Exercise burn: <strong><span id="r-exburn">{fmt(result.exPerDay)}</span> cal/day</strong>
      </div>
    </div>
  )
}
