import { useState } from 'react'
import { CalcMode, Unit } from '@/types'
import { KG_TO_LBS, fmtD } from '@/utils/calculator'

interface FormState {
  cw: string; gw: string; age: string
  htFt: string; htIn: string; htCm: string
  sex: 'male' | 'female'; goalDate: string
  cal: number; walk: number; lift: number; cardio: number; act: number
}

interface Props {
  form: FormState
  unit: Unit
  calcMode: CalcMode
  onFormChange: (p: Partial<FormState>) => void
  onUnitChange: (u: Unit) => void
  onSave: () => void
  saveState: 'idle' | 'saving' | 'saved'
}

const OCCASIONS = [
  { label: 'Wedding 💍', months: 3 },
  { label: 'Vacation 🏖️', months: 2 },
  { label: 'Reunion 🎓', months: 4 },
  { label: 'Summer 🌞', months: 5 },
  { label: 'Health 💚', months: 6 },
]

export function AboutYou({ form, unit, calcMode, onFormChange, onUnitChange, onSave, saveState }: Props) {
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null)

  function toggleUnit() {
    const next: Unit = unit === 'lbs' ? 'kg' : 'lbs'
    const factor = next === 'kg' ? 1 / KG_TO_LBS : KG_TO_LBS
    onUnitChange(next)
    onFormChange({
      cw:   fmtD(parseFloat(form.cw)   * factor),
      gw:   fmtD(parseFloat(form.gw)   * factor),
      htFt: unit === 'lbs' ? String(Math.floor((parseInt(form.htCm) || 173) / 30.48))      : form.htFt,
      htIn: unit === 'lbs' ? String(Math.round(((parseInt(form.htCm) || 173) / 2.54) % 12)) : form.htIn,
      htCm: unit === 'kg'  ? String(Math.round((parseInt(form.htFt) || 5) * 30.48 + (n => isNaN(n) ? 0 : n)(parseInt(form.htIn)) * 2.54)) : form.htCm,
    })
  }

  function setOccasion(label: string, months: number) {
    const d = new Date()
    d.setMonth(d.getMonth() + months)
    setActiveOccasion(label)
    onFormChange({ goalDate: d.toISOString().split('T')[0] })
  }

  const btnLabel = saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved ✓' : 'Save details'
  const sfx = unit === 'lbs' ? 'lbs' : 'kg'

  return (
    <div className="card">
      <div className="card-title">
        <div className="ico">👤</div> About You
        <button className="unit-toggle-btn" onClick={toggleUnit}>{unit === 'lbs' ? 'kg' : 'lbs'}</button>
      </div>

      {calcMode === 'date' && (
        <div id="occasion-section" style={{ marginBottom: 14 }}>
          <div className="field" style={{ marginBottom: 8 }}><label>What's the occasion?</label></div>
          <div className="occasion-chips">
            {OCCASIONS.map(o => (
              <button key={o.label} className={`occasion-chip${activeOccasion === o.label ? ' active' : ''}`} onClick={() => setOccasion(o.label, o.months)}>{o.label}</button>
            ))}
          </div>
          <div className="field">
            <label>Target Date</label>
            <div className="inp-wrap">
              <input type="date" id="goalDate" value={form.goalDate} onChange={e => { setActiveOccasion(null); onFormChange({ goalDate: e.target.value }) }} />
            </div>
          </div>
        </div>
      )}

      <div className="field-row">
        <div className="field">
          <label>Current Weight</label>
          <div className="inp-wrap">
            <input type="number" id="cw" value={form.cw} min="80" max="650" inputMode="decimal" className="has-sfx"
              onChange={e => onFormChange({ cw: e.target.value })} />
            <span className="sfx unit-sfx">{sfx}</span>
          </div>
        </div>
        {calcMode === 'weight' && (
          <div className="field" id="gw-field">
            <label>Goal Weight</label>
            <div className="inp-wrap">
              <input type="number" id="gw" value={form.gw} min="50" max="650" inputMode="decimal" className="has-sfx"
                onChange={e => onFormChange({ gw: e.target.value })} />
              <span className="sfx unit-sfx">{sfx}</span>
            </div>
          </div>
        )}
      </div>

      <div className="field-row">
        <div className="field">
          <label>Age</label>
          <div className="inp-wrap">
            <input type="number" id="age" value={form.age} min="16" max="90" inputMode="numeric"
              onChange={e => onFormChange({ age: e.target.value })} />
          </div>
        </div>
        <div className="field">
          <label>Sex</label>
          <div className="inp-wrap">
            <select id="sex" value={form.sex} onChange={e => onFormChange({ sex: e.target.value as 'male' | 'female' })}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>
      </div>

      {unit === 'lbs' ? (
        <div className="field-row" id="ht-ft-row">
          <div className="field">
            <label>Height (ft)</label>
            <div className="inp-wrap">
              <input type="number" id="ht-ft" value={form.htFt} min="3" max="8" inputMode="numeric" className="has-sfx"
                onChange={e => onFormChange({ htFt: e.target.value })} />
              <span className="sfx">ft</span>
            </div>
          </div>
          <div className="field">
            <label>Height (in)</label>
            <div className="inp-wrap">
              <input type="number" id="ht-in" value={form.htIn} min="0" max="11" inputMode="numeric" className="has-sfx"
                onChange={e => onFormChange({ htIn: e.target.value })} />
              <span className="sfx">in</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="field-row" id="ht-cm-row">
          <div className="field">
            <label>Height</label>
            <div className="inp-wrap">
              <input type="number" id="ht-cm" value={form.htCm} min="91" max="243" inputMode="numeric" className="has-sfx"
                onChange={e => onFormChange({ htCm: e.target.value })} />
              <span className="sfx">cm</span>
            </div>
          </div>
        </div>
      )}

      <button
        className={`about-save-btn${saveState === 'saved' ? ' saved' : ''}`}
        onClick={onSave}
        disabled={saveState === 'saving'}
      >
        {btnLabel}
      </button>
    </div>
  )
}
