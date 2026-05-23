import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Checkin, Plan, Unit } from '@/types'
import { useUI } from '@/store/ui'
import { ph } from '@/lib/analytics'
import { fmtWt } from '@/utils/calculator'
import { calcStreakFromEntries } from '@/utils/streak'
import { CheckinForm } from './CheckinForm'
import { CheckinList } from './CheckinList'
import { CheckinChart } from './CheckinChart'
import { ProgressSnapshot } from './ProgressSnapshot'

interface Props {
  user: User | null
  plan: Plan | null
  checkins: Checkin[]
  unit: Unit
  onAdd: (entry: Omit<Checkin, 'id'> & { id?: number }) => Promise<Checkin>
  onDelete: (date: string) => Promise<void>
}

const MILESTONE_WEIGHTS = [4, 8, 13, 26, 52]

export function CheckinPage({ plan, checkins, unit, onAdd, onDelete }: Props) {
  const { editId, setEditId, showToast, queueCelebration } = useUI()
  const [celebratedMilestones, setCelebratedMilestones] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('tr_celebrated') || '[]') } catch { return [] }
  })

  const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date))
  const latest = sorted[sorted.length - 1]
  const streak = calcStreakFromEntries(checkins)

  async function handleSubmit(date: string, weight: number, note: string) {
    const editingCheckin = editId != null ? checkins.find(c => c.id === editId) : null

    if (!editingCheckin && checkins.some(c => c.date === date)) {
      showToast('You already have a check-in for this date.')
      return
    }

    try {
      const entry: Omit<Checkin, 'id'> & { id?: number } = {
        ...(editingCheckin ? { id: editingCheckin.id } : {}),
        date, weight, note,
      }
      await onAdd(entry)
      setEditId(null)
      checkMilestones(weight)
      ph.capture('checkin_logged', { is_edit: !!editingCheckin })
      showToast(editingCheckin ? 'Check-in updated.' : 'Check-in saved!')
    } catch {
      showToast('Could not save. Your check-in is stored locally.')
    }
  }

  function checkMilestones(newWeight: number) {
    if (!plan) return
    const newStreak = calcStreakFromEntries([...checkins, { id: 0, date: '', weight: newWeight, note: '' }])

    // Weight milestones at 10%, 20%, ... of goal
    const totalLoss = plan.cw - plan.gw
    if (totalLoss > 0) {
      [0.1, 0.25, 0.5, 0.75, 1].forEach(pct => {
        const target = plan.cw - totalLoss * pct
        const key = `loss_${pct}`
        if (newWeight <= target && !celebratedMilestones.includes(key)) {
          const label = pct === 1 ? 'Goal reached!' : `${Math.round(pct * 100)}% of goal`
          queueCelebration('🎉', label, fmtWt(totalLoss * pct, unit) + ' lost!')
          const next = [...celebratedMilestones, key]
          setCelebratedMilestones(next)
          localStorage.setItem('tr_celebrated', JSON.stringify(next))
        }
      })
    }

    // Streak milestones
    MILESTONE_WEIGHTS.forEach(w => {
      const key = `streak_${w}`
      if (newStreak >= w && !celebratedMilestones.includes(key)) {
        queueCelebration('🔥', `${w}-Week Streak!`, 'Consistency is your superpower.')
        const next = [...celebratedMilestones, key]
        setCelebratedMilestones(next)
        localStorage.setItem('tr_celebrated', JSON.stringify(next))
      }
    })
  }

  return (
    <div className="page page-checkin active">
      <div className="ci-page-hero">
        <h1>Weekly Check‑In</h1>
        <div className="streak-badge">
          {streak > 0 ? `🔥 ${streak}-week streak` : 'Log your weight weekly'}
        </div>
      </div>

      <div className="cards-wrap">
        {!plan && (
          <div className="banner warn" id="no-plan-warn" style={{ marginBottom: 16 }}>
            <span className="bico">⚠️</span>
            <div>Set up your plan on the Calculator tab first.</div>
          </div>
        )}

        <ProgressSnapshot plan={plan} checkins={sorted} unit={unit} />

        <CheckinForm
          editId={editId}
          checkins={checkins}
          unit={unit}
          latestWeight={latest?.weight ?? plan?.cw ?? null}
          onSubmit={handleSubmit}
          onCancelEdit={() => setEditId(null)}
        />

        {checkins.length >= 3 && (
          <CheckinChart checkins={sorted} plan={plan} unit={unit} />
        )}

        <CheckinList
          checkins={sorted}
          unit={unit}
          plan={plan}
          editId={editId}
          onEdit={setEditId}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
