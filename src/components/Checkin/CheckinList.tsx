import { useState } from 'react'
import { Checkin, Plan, Unit } from '@/types'
import { fmtWt } from '@/utils/calculator'
import { useUI } from '@/store/ui'

interface Props {
  checkins: Checkin[]
  unit: Unit
  plan: Plan | null
  editId: number | null
  onEdit: (id: number) => void
  onDelete: (date: string) => Promise<void>
}

export function CheckinList({ checkins, unit, plan, editId, onEdit, onDelete }: Props) {
  const { showToast } = useUI()
  const [confirmDate, setConfirmDate] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (!checkins.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="ei">📋</div>
          <h4>No check-ins yet</h4>
          <p>Log your weight each week to track real progress. Consistency is everything.</p>
        </div>
      </div>
    )
  }

  const sorted   = [...checkins].sort((a, b) => b.date.localeCompare(a.date))
  const startWt  = plan?.cw ?? sorted[sorted.length - 1].weight

  async function handleDelete(date: string) {
    if (confirmDate !== date) { setConfirmDate(date); setTimeout(() => setConfirmDate(null), 3000); return }
    setDeleting(date); setConfirmDate(null)
    try { await onDelete(date) } catch { showToast('Could not delete. Try again.') }
    setDeleting(null)
  }

  return (
    <div className="card ci-entries-wrap">
      {sorted.map((ci, i) => {
        const prevWt = i < sorted.length - 1 ? sorted[i + 1].weight : startWt
        const delta   = +(ci.weight - prevWt).toFixed(1)
        const isEditing = ci.id === editId
        return (
          <div key={ci.id} className={`ci-entry${isEditing ? ' editing' : ''}`}>
            <div className="ci-entry-main">
              <div className="ci-date">{ci.date}</div>
              <div className="ci-weight">{fmtWt(ci.weight, unit)}</div>
              <div className={`ci-delta ${delta <= 0 ? 'good' : 'bad'}`}>
                {delta === 0 ? '—' : (delta < 0 ? '↓' : '↑') + fmtWt(Math.abs(delta), unit)}
              </div>
              <div className="ci-actions">
                <button className="edit-btn" onClick={() => onEdit(ci.id)}>Edit</button>
                <button
                  className="del-btn"
                  onClick={() => handleDelete(ci.date)}
                  disabled={deleting === ci.date}
                >
                  {deleting === ci.date ? '…' : confirmDate === ci.date ? 'Confirm?' : '🗑'}
                </button>
              </div>
            </div>
            {ci.note && <div className="ci-note">{ci.note}</div>}
          </div>
        )
      })}
    </div>
  )
}
