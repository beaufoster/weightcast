import { User } from '@supabase/supabase-js'
import { Checkin, Plan } from '@/types'
import { useUI } from '@/store/ui'
import { AccountButton } from '@/components/Account/AccountButton'

interface Props {
  user: User | null
  plan: Plan | null
  checkins: Checkin[]
}

export function TopNav({ user, plan, checkins }: Props) {
  const { page } = useUI()

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <span className="wordmark">Trimly</span>
        <nav className="desktop-nav-tabs">
          <DesktopTab label="Calculator" target="calculator" active={page === 'calculator'} />
          <DesktopTab label="Check-In"   target="checkin"   active={page === 'checkin'}   />
        </nav>
        <AccountButton user={user} plan={plan} checkins={checkins} />
      </div>
    </header>
  )
}

function DesktopTab({ label, target, active }: { label: string; target: string; active: boolean }) {
  const { setPage } = useUI()
  return (
    <button
      className={`desktop-nav-tab${active ? ' active' : ''}`}
      onClick={() => setPage(target as 'calculator' | 'checkin')}
    >
      {label}
    </button>
  )
}
