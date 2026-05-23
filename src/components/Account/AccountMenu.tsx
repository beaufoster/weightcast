import { User } from '@supabase/supabase-js'
import { useUI } from '@/store/ui'
import { supabase } from '@/lib/supabase'
import { ph } from '@/lib/analytics'

interface Props { user: User | null }

export function AccountMenu({ user }: Props) {
  const { accountMenuOpen, closeAccountMenu, openAccountSheet, showToast } = useUI()
  if (!accountMenuOpen || !user) return null

  async function handleSignOut() {
    if (!supabase) return
    closeAccountMenu()
    await supabase.auth.signOut()
    ph.reset()
    showToast('Signed out. Your data is saved to your account.')
  }

  return (
    <>
      <div className="account-menu-backdrop" onClick={closeAccountMenu} />
      <div className="account-menu">
        <button className="account-menu-item" onClick={() => { closeAccountMenu(); openAccountSheet() }}>
          Account Settings
        </button>
        <button className="account-menu-item danger" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </>
  )
}
