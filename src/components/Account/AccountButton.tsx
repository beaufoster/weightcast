import { User } from '@supabase/supabase-js'
import { Checkin, Plan } from '@/types'
import { useUI } from '@/store/ui'
import { calcStreakFromEntries } from '@/utils/streak'
import { keys } from '@/lib/storage'

interface Props { user: User | null; plan: Plan | null; checkins: Checkin[] }

export function AccountButton({ user, checkins }: Props) {
  const { openSyncSheet, toggleAccountMenu } = useUI()
  const name = localStorage.getItem(keys.name) || ''
  const initial = name ? name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() ?? '?'
  const streak = calcStreakFromEntries(checkins)

  if (!user) {
    return (
      <button className="account-btn" onClick={() => openSyncSheet()}>
        Sign In
      </button>
    )
  }

  return (
    <button
      className="account-btn signed-in"
      onClick={toggleAccountMenu}
      title={`${name || user.email}${streak > 1 ? ` · ${streak}wk streak` : ''}`}
    >
      {initial}
    </button>
  )
}
