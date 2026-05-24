import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Checkin, CalcMode, Pace, Plan, Unit } from '@/types'
import { useUI } from '@/store/ui'
import { keys } from '@/lib/storage'
import { ph } from '@/lib/analytics'
import { DEMO_NAME } from '@/lib/demoData'
import {
  KG_TO_LBS, actMults, addWeeks, calcBMR, fmtD,
  fromLbs, paceConfigs, simulateLoss, toLbs,
} from '@/utils/calculator'
import { AboutYou } from './AboutYou'
import { DietCard } from './DietCard'
import { ExerciseCard } from './ExerciseCard'
import { PaceCard } from './PaceCard'
import { ResultsCard } from './ResultsCard'
import { ProjectionChart } from './ProjectionChart'
import { MilestonesCard } from './MilestonesCard'

interface Props {
  user: User | null
  plan: Plan | null
  checkins: Checkin[]
  unit: Unit
  onSavePlan: (p: Plan) => Promise<Plan>
  isSavingPlan: boolean
  onUnitChange: (u: Unit) => void
}

// ── form state (persisted to localStorage as display cache) ──────────────────

interface FormState {
  cw: string; gw: string; age: string
  htFt: string; htIn: string; htCm: string
  sex: 'male' | 'female'
  cal: number; walk: number; lift: number; cardio: number; act: number
  goalDate: string
}

function loadSavedForm(plan: Plan | null, unit: Unit): FormState {
  try {
    const raw = localStorage.getItem(keys.form)
    if (raw) return JSON.parse(raw)
  } catch {}
  // Fall back to plan values if no saved form
  if (plan) {
    const cw = fromLbs(plan.cw, unit)
    const gw = fromLbs(plan.gw, unit)
    return {
      cw: fmtD(cw), gw: fmtD(gw),
      age: String(plan.age ?? 35),
      htFt: String(plan.htFt ?? 5), htIn: String(plan.htIn ?? 8), htCm: String(plan.htCm ?? 173),
      sex: plan.sex ?? 'male',
      cal: plan.cal ?? 1800, walk: plan.walk ?? 30,
      lift: plan.lift ?? 2, cardio: plan.cardio ?? 1, act: plan.act ?? 2,
      goalDate: plan.goalDate ? plan.goalDate.split('T')[0] : '',
    }
  }
  return {
    cw: unit === 'kg' ? fmtD(175 / KG_TO_LBS) : '175',
    gw: unit === 'kg' ? fmtD(155 / KG_TO_LBS) : '155',
    age: '35', htFt: '5', htIn: '8', htCm: '173', sex: 'male',
    cal: 1800, walk: 30, lift: 2, cardio: 1, act: 2, goalDate: '',
  }
}

function saveFormCache(f: FormState, calcMode: CalcMode, pace: Pace) {
  localStorage.setItem(keys.form, JSON.stringify({ ...f, pace, mode: calcMode }))
}

// ── calculation result ────────────────────────────────────────────────────────

interface CalcResult {
  tdee: number; exPerDay: number; deficit: number
  weeks: number | null; projDate: Date | null
  projWt: number | null; avgRate: number | null
  totalLoss: number; sim: Array<{ week: number; weight: number }>
  plan: Plan | null; error: string | null
}

function runCalc(f: FormState, calcMode: CalcMode, pace: Pace, unit: Unit, existingPlan: Plan | null): CalcResult {
  const cw  = Math.max(toLbs(parseFloat(f.cw) || 210, unit), 50)
  const age  = parseInt(f.age) || 35
  const sex  = f.sex
  const ht   = unit === 'kg'
    ? Math.round((parseInt(f.htCm) || 178) / 2.54)
    : (parseInt(f.htFt) || 5) * 12 + (parseInt(f.htIn) || 10)
  const cal  = f.cal
  const actIdx = f.act - 1
  const bmr0 = calcBMR(cw, ht, age, sex)
  const tdee  = bmr0 * actMults[actIdx]
  const exPerDay = f.walk * 3.5 + (f.lift * 300) / 7 + (f.cardio * 500) / 7
  const safeCal = Math.max(cal, 1200)
  const deficit = Math.max(tdee + exPerDay - safeCal, 0)

  const htFt = unit === 'kg' ? Math.floor((parseInt(f.htCm) || 173) / 2.54 / 12) : parseInt(f.htFt) || 5
  const htIn  = unit === 'kg' ? Math.round(((parseInt(f.htCm) || 173) / 2.54) % 12) : parseInt(f.htIn) || 8
  const htCm  = unit === 'lbs' ? Math.round((parseInt(f.htFt) || 5) * 30.48 + (parseInt(f.htIn) || 8) * 2.54) : parseInt(f.htCm) || 173

  const basePlan = {
    age, htFt, htIn, htCm, sex, act: f.act,
    walk: f.walk, lift: f.lift, cardio: f.cardio,
    cal: safeCal, exPerDay, pace,
    savedAt: existingPlan?.savedAt || new Date().toISOString(),
    startWt: existingPlan?.startWt ?? existingPlan?.cw ?? cw,
  }

  if (calcMode === 'date') {
    if (!f.goalDate) return { tdee, exPerDay, deficit, weeks: null, projDate: null, projWt: null, avgRate: null, totalLoss: 0, sim: [], plan: null, error: 'Pick a date' }
    const targetDate  = new Date(f.goalDate + 'T12:00')
    const weeksAvail  = Math.max(0, Math.round((targetDate.getTime() - Date.now()) / (7 * 24 * 3600 * 1000)))
    if (weeksAvail < 1) return { tdee, exPerDay, deficit, weeks: null, projDate: targetDate, projWt: null, avgRate: null, totalLoss: 0, sim: [], plan: null, error: 'Pick a future date' }
    const maxLbs = paceConfigs[pace].max
    const sim: Array<{ week: number; weight: number }> = []
    let wtS = cw
    for (let w = 1; w <= weeksAvail; w++) {
      const bmrW = calcBMR(wtS, ht, age, sex)
      const tdeeW = bmrW * actMults[actIdx] + exPerDay
      const def = Math.min(Math.max(tdeeW - safeCal, 0), maxLbs * 3500 / 7)
      wtS = Math.max(wtS - (def * 7 / 3500), 50)
      sim.push({ week: w, weight: +wtS.toFixed(1) })
    }
    const projWt    = +wtS.toFixed(1)
    const totalLoss = +(cw - projWt).toFixed(1)
    const avgRate   = +(totalLoss / weeksAvail).toFixed(1)
    const goalDate  = targetDate.toISOString()
    const plan: Plan = { ...basePlan, cw, gw: projWt, sim, goalDate, mode: 'date' }
    return { tdee, exPerDay, deficit, weeks: weeksAvail, projDate: targetDate, projWt, avgRate, totalLoss, sim, plan, error: null }
  }

  // weight mode
  const gw = Math.max(toLbs(parseFloat(f.gw) || 175, unit), 30)
  const totalLoss = +Math.max(cw - gw, 0).toFixed(1)
  if (totalLoss <= 0) {
    const plan: Plan = { ...basePlan, cw, gw, sim: [], goalDate: new Date().toISOString(), mode: 'weight' }
    return { tdee, exPerDay, deficit, weeks: 0, projDate: null, projWt: gw, avgRate: 0, totalLoss: 0, sim: [], plan, error: null }
  }
  if (deficit < 50) {
    return { tdee, exPerDay, deficit, weeks: null, projDate: null, projWt: null, avgRate: null, totalLoss, sim: [], plan: null, error: 'Increase deficit' }
  }
  const sim = simulateLoss(cw, gw, cal, exPerDay, actMults[actIdx], age, ht, sex, paceConfigs[pace].max)
  if (!sim.length) return { tdee, exPerDay, deficit, weeks: null, projDate: null, projWt: null, avgRate: null, totalLoss, sim: [], plan: null, error: 'Increase deficit' }
  const avgRate   = totalLoss / sim.length
  const goalDate  = addWeeks(new Date(), sim.length)
  const plan: Plan = { ...basePlan, cw, gw, sim, goalDate: goalDate.toISOString(), mode: 'weight' }
  return { tdee, exPerDay, deficit, weeks: sim.length, projDate: goalDate, projWt: gw, avgRate, totalLoss, sim, plan, error: null }
}

// ── component ─────────────────────────────────────────────────────────────────

export function CalculatorPage({ user, plan, checkins, unit, onSavePlan, onUnitChange }: Props) {
  const { calcMode, pace, setCalcMode, setPace, showToast, openSyncSheet } = useUI()
  const [form, setFormRaw] = useState<FormState>(() => loadSavedForm(plan, unit))
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const phTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const planSyncedRef = useRef(false)
  const lastSyncedWtRef = useRef<number | null>(null)

  const result = useMemo(() => runCalc(form, calcMode, pace, unit, plan), [form, calcMode, pace, unit, plan])

  // When plan loads from Supabase (sign-in on fresh device), sync form if no local form cache exists
  useEffect(() => {
    if (plan && !planSyncedRef.current && !localStorage.getItem(keys.form)) {
      planSyncedRef.current = true
      setFormRaw(loadSavedForm(plan, unit))
      if (plan.pace) setPace(plan.pace)
      if (plan.mode) setCalcMode(plan.mode)
    }
  }, [plan])

  // Auto-sync current weight field from latest check-in (only when signed in)
  useEffect(() => {
    if (!user || !checkins.length) return
    const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date))
    const latestWt = sorted[0].weight
    if (latestWt !== lastSyncedWtRef.current) {
      lastSyncedWtRef.current = latestWt
      setFormRaw(prev => ({ ...prev, cw: fmtD(fromLbs(latestWt, unit)) }))
    }
  }, [checkins, unit, user])

  // Persist form as display cache only when signed in (avoids demo values leaking into localStorage)
  useEffect(() => {
    if (user) saveFormCache(form, calcMode, pace)
  }, [form, calcMode, pace, user])

  // Analytics debounce
  const trackSlider = useCallback(() => {
    if (phTimer.current) clearTimeout(phTimer.current)
    phTimer.current = setTimeout(() => ph.capture('slider_moved', { mode: calcMode }), 600)
  }, [calcMode])

  function setForm(patch: Partial<FormState>) {
    setFormRaw(prev => ({ ...prev, ...patch }))
    trackSlider()
  }

  async function handleSaveAboutYou() {
    if (!user) { openSyncSheet('signup'); return }
    if (!result.plan) { showToast('Fix your values before saving.'); return }
    setSaveState('saving')
    try {
      await onSavePlan(result.plan)
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      showToast('Could not save. Check your connection.')
      setSaveState('idle')
    }
  }

  const name = user ? (localStorage.getItem(keys.name) || '') : DEMO_NAME

  return (
    <div className="page page-calculator active">
      <div className="hero-band">
        {name && <div className="hero-name-line">Hi, {name}! 👋</div>}
        <p className="hero-sub" id="hero-greeting">
          {user
            ? (name ? 'Adjust your plan and watch the results update live.' : 'Adjust diet & exercise — watch your results update live.')
            : <>This is <strong>sample data</strong>. <button className="hero-demo-link" onClick={() => openSyncSheet('signup')}>Create your free account</button> to save your own plan.</>
          }
        </p>
        <div className="mode-switch">
          <button className={`mode-btn${calcMode === 'weight' ? ' active' : ''}`} onClick={() => setCalcMode('weight')}>
            <span className="mico">🎯</span>Goal Weight
          </button>
          <button className={`mode-btn${calcMode === 'date' ? ' active' : ''}`} onClick={() => setCalcMode('date')}>
            <span className="mico">📅</span>Target Date
          </button>
        </div>
        {calcMode === 'weight' && (
          <p id="occasion-hint" className="occasion-hint">
            Planning for a wedding, vacation, or event? Try <strong>Target Date</strong> mode above.
          </p>
        )}
      </div>

      <div className="cards-wrap">
        <AboutYou
          form={form} unit={unit} calcMode={calcMode}
          onFormChange={setForm} onUnitChange={onUnitChange}
          onSave={handleSaveAboutYou} saveState={saveState}
        />

        <DietCard form={form} result={result} unit={unit} onFormChange={setForm} />
        <ExerciseCard form={form} result={result} onFormChange={setForm} />
        <PaceCard pace={pace} unit={unit} onPaceChange={(p) => { setPace(p); trackSlider() }} />
        <ResultsCard result={result} calcMode={calcMode} unit={unit} plan={result.plan} checkins={checkins} />
        {result.sim.length > 0 && result.plan && (
          <>
            <MilestonesCard plan={result.plan} unit={unit} checkins={checkins} />
            <ProjectionChart sim={result.sim} cw={result.plan.cw} gw={result.plan.gw} unit={unit} />
          </>
        )}
      </div>
    </div>
  )
}
