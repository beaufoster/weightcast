import { useEffect, useState } from 'react'
import { Checkin, Unit } from '@/types'
import { fmtD, fromLbs, toLbs } from '@/utils/calculator'

interface Props {
  editId: number | null
  checkins: Checkin[]
  unit: Unit
  latestWeight: number | null
  onSubmit: (date: string, weight: number, note: string) => Promise<void>
  onCancelEdit: () => void
}

export function CheckinForm({ editId, checkins, unit, latestWeight, onSubmit, onCancelEdit }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const editingEntry = editId != null ? checkins.find(c => c.id === editId) : null

  const [date,   setDate]   = useState(editingEntry?.date ?? today)
  const [weight, setWeight] = useState(editingEntry ? fmtD(fromLbs(editingEntry.weight, unit)) : (latestWeight ? fmtD(fromLbs(latestWeight, unit)) : ''))
  const [note,   setNote]   = useState(editingEntry?.note ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingEntry) {
      setDate(editingEntry.date)
      setWeight(fmtD(fromLbs(editingEntry.weight, unit)))
      setNote(editingEntry.note)
    } else {
      setDate(today)
      setWeight(latestWeight ? fmtD(fromLbs(latestWeight, unit)) : '')
      setNote('')
    }
  }, [editId, unit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const wLbs = toLbs(parseFloat(weight), unit)
    if (!date || isNaN(wLbs) || wLbs < 50 || wLbs > 650) return
    setSaving(true)
    await onSubmit(date, wLbs, note)
    setSaving(false)
    if (!editingEntry) {
      setWeight(fmtD(fromLbs(wLbs, unit)))
      setNote('')
    }
  }

  return (
    <div className="card checkin-form-card">
      <div className="card-title"><div className="ico">📝</div> {editingEntry ? 'Edit Check-In' : 'Log Check-In'}</div>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field">
            <label>Date</label>
            <div className="inp-wrap">
              <input type="date" id="ci-date" value={date} max={today}
                onChange={e => setDate(e.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label>Weight ({unit})</label>
            <div className="inp-wrap">
              <input type="number" id="ci-weight" value={weight} placeholder="0.0"
                step="0.1" min="50" max="600" inputMode="decimal"
                onChange={e => setWeight(e.target.value)} required />
            </div>
          </div>
        </div>
        <div className="field">
          <label>Note <span className="field-optional">(optional)</span></label>
          <div className="inp-wrap">
            <input type="text" id="ci-note" value={note} placeholder="How are you feeling?"
              maxLength={200} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn-add" disabled={saving}>
          {saving ? 'Saving…' : editingEntry ? 'Update ✓' : 'Log Check-In'}
        </button>
        {editingEntry && (
          <button type="button" className="btn-cancel-edit" onClick={onCancelEdit}>
            Cancel
          </button>
        )}
      </form>
    </div>
  )
}
