import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCheckins } from '@/hooks/useCheckins'
import { usePlan } from '@/hooks/usePlan'
import { useProfile } from '@/hooks/useProfile'
import { useUI } from '@/store/ui'
import { IS_TEST } from '@/lib/analytics'
import { CalculatorPage } from '@/components/Calculator/CalculatorPage'
import { CheckinPage } from '@/components/Checkin/CheckinPage'
import { AuthSheet } from '@/components/Auth/AuthSheet'
import { AccountSheet } from '@/components/Account/AccountSheet'
import { AccountMenu } from '@/components/Account/AccountMenu'
import { Toast } from '@/components/Shared/Toast'
import { Celebration } from '@/components/Shared/Celebration'
import { TabBar } from '@/components/Shared/TabBar'
import { TopNav } from '@/components/Shared/TopNav'
import { ConfettiCanvas } from '@/components/Shared/ConfettiCanvas'

export default function App() {
  const { user, loading } = useAuth()
  const { checkins, addCheckin, deleteCheckin } = useCheckins(user)
  const { plan, savePlan, isSaving: isSavingPlan } = usePlan(user)
  const { profile, updateUnit, updateName } = useProfile(user)
  const { page, unit, setUnit, toastMessage, celebrationQueue } = useUI()

  // Sync unit pref from profile when it loads
  useEffect(() => {
    if (profile?.unit_pref && profile.unit_pref !== unit) {
      setUnit(profile.unit_pref)
    }
  }, [profile?.unit_pref])

  // Test mode indicator
  useEffect(() => {
    if (IS_TEST) document.body.classList.add('is-test')
  }, [])

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    )
  }

  return (
    <>
      <ConfettiCanvas />
      {IS_TEST && <div className="test-env-bar">🧪 TEST MODE — data isolated, analytics disabled</div>}

      <TopNav user={user} plan={plan} checkins={checkins} />

      <main className="app-main">
        {page === 'calculator' && (
          <CalculatorPage
            user={user}
            plan={plan}
            checkins={checkins}
            unit={unit}
            onSavePlan={savePlan}
            isSavingPlan={isSavingPlan}
            onUnitChange={setUnit}
          />
        )}
        {page === 'checkin' && (
          <CheckinPage
            user={user}
            plan={plan}
            checkins={checkins}
            unit={unit}
            onAdd={addCheckin}
            onDelete={deleteCheckin}
          />
        )}
      </main>

      <TabBar />

      <AuthSheet user={user} />
      <AccountSheet
        user={user}
        profile={profile}
        unit={unit}
        onUpdateUnit={updateUnit}
        onUpdateName={updateName}
      />
      <AccountMenu user={user} />

      {toastMessage && <Toast message={toastMessage} />}
      {celebrationQueue[0] && <Celebration {...celebrationQueue[0]} />}
    </>
  )
}
