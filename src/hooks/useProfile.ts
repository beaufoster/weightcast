import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile, Unit } from '@/types'
import { keys } from '@/lib/storage'

export const profileKeys = {
  all: (uid: string) => ['profile', uid] as const,
}

export function useProfile(user: User | null) {
  const qc = useQueryClient()
  const uid = user?.id ?? null

  const query = useQuery({
    queryKey: uid ? profileKeys.all(uid) : ['profile', 'offline'],
    queryFn: async () => {
      if (!uid || !supabase) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('display_name, unit_pref')
        .eq('user_id', uid)
        .maybeSingle()
      if (error) throw error
      if (data?.unit_pref) localStorage.setItem(keys.unit, data.unit_pref)
      if (data?.display_name) localStorage.setItem(keys.name, data.display_name)
      return data as Profile | null
    },
    staleTime: 60_000,
    enabled: !!uid,
  })

  const saveProfile = useMutation({
    mutationFn: async (update: Partial<Profile>) => {
      if (!uid || !supabase) return
      const { error } = await supabase.from('profiles').upsert(
        { user_id: uid, ...update, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      if (error) throw error
      if (update.unit_pref) localStorage.setItem(keys.unit, update.unit_pref)
      if (update.display_name != null) localStorage.setItem(keys.name, update.display_name ?? '')
    },
    onSettled: () => {
      if (uid) qc.invalidateQueries({ queryKey: profileKeys.all(uid) })
    },
  })

  const updateUnit = (unit: Unit) => saveProfile.mutateAsync({ unit_pref: unit })
  const updateName = (name: string) => saveProfile.mutateAsync({ display_name: name })

  return {
    profile:    query.data ?? null,
    isLoading:  query.isLoading,
    updateUnit,
    updateName,
    isSaving:   saveProfile.isPending,
  }
}
