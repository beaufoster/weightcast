import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Profile, Unit } from '@/types'
import { useUI } from '@/store/ui'
import { supabase } from '@/lib/supabase'

interface Props {
  user: User | null
  profile: Profile | null
  unit: Unit
  onUpdateUnit: (u: Unit) => Promise<void>
  onUpdateName: (n: string) => Promise<void>
}

export function AccountSheet({ user, profile, unit, onUpdateUnit, onUpdateName }: Props) {
  const { accountSheetOpen, closeAccountSheet, showToast } = useUI()
  const [name, setName]           = useState(profile?.display_name ?? '')
  const [email, setEmail]             = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving]       = useState<string | null>(null)

  if (!accountSheetOpen || !user) return null

  async function saveName() {
    setSaving('name')
    await onUpdateName(name)
    setSaving(null)
    showToast('Name updated.')
  }

  async function saveEmail() {
    if (!supabase) return
    setSaving('email')
    const { error } = await supabase.auth.updateUser({ email })
    setSaving(null)
    if (error) { showToast(error.message); return }
    showToast('Check your new inbox to confirm the change.')
    setEmail('')
  }

  async function savePassword() {
    if (!supabase) return
    if (newPassword.length < 6) { showToast('Password must be at least 6 characters.'); return }
    setSaving('password')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSaving(null)
    if (error) { showToast(error.message); return }
    showToast('Password updated.')
    setNewPassword('')
  }

  return (
    <div className="sync-overlay show" onClick={e => { if (e.target === e.currentTarget) closeAccountSheet() }}>
      <div className="sync-sheet account-sheet">
        <button className="sync-close-btn" onClick={closeAccountSheet}>✕</button>
        <h2 className="sync-auth-title">Account Settings</h2>

        <div className="account-section">
          <label className="account-label">Display Name</label>
          <div className="account-row">
            <input className="sync-input" value={name} onChange={e => setName(e.target.value)} placeholder="Your first name" />
            <button className="acct-save-btn" onClick={saveName} disabled={saving === 'name'}>
              {saving === 'name' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="account-section">
          <label className="account-label">Units</label>
          <div className="acct-unit-toggle">
            {(['lbs', 'kg'] as Unit[]).map(u => (
              <button
                key={u}
                className={`acct-unit-btn${unit === u ? ' active' : ''}`}
                onClick={() => onUpdateUnit(u)}
              >{u}</button>
            ))}
          </div>
        </div>

        <div className="account-section">
          <label className="account-label">Change Email</label>
          <div className="account-row">
            <input className="sync-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="New email address" />
            <button className="acct-save-btn" onClick={saveEmail} disabled={saving === 'email'}>
              {saving === 'email' ? 'Sending…' : 'Update'}
            </button>
          </div>
        </div>

        <div className="account-section">
          <label className="account-label">Change Password</label>
          <div className="account-row">
            <input className="sync-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (6+ chars)" />
            <button className="acct-save-btn" onClick={savePassword} disabled={saving === 'password'}>
              {saving === 'password' ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>

        <p className="account-email-hint">Signed in as <strong>{user.email}</strong></p>
      </div>
    </div>
  )
}
