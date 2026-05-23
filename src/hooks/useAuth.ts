import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { ph } from '@/lib/analytics'
import { queryClient } from '@/lib/queryClient'

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setLoading(false); return }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) ph.identify(u.id, { email: u.email ?? '' })
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(prev => {
        // When user changes (sign-in/out), clear all cached queries so
        // fresh data is fetched for the new user
        if (prev?.id !== u?.id) {
          queryClient.clear()
        }
        return u
      })
      if (u) ph.identify(u.id, { email: u.email ?? '' })
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
