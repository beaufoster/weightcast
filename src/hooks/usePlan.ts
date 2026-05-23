import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Plan } from '@/types'

const LOCAL_KEY = 'tr_plan'

function loadLocal(): Plan | null {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || 'null') } catch { return null }
}
function saveLocal(p: Plan | null) {
  if (p) localStorage.setItem(LOCAL_KEY, JSON.stringify(p))
  else localStorage.removeItem(LOCAL_KEY)
}

export const planKeys = {
  all: (uid: string) => ['plan', uid] as const,
}

export function usePlan(user: User | null) {
  const qc = useQueryClient()
  const uid = user?.id ?? null

  const query = useQuery({
    queryKey: uid ? planKeys.all(uid) : ['plan', 'offline'],
    queryFn: async () => {
      if (!uid || !supabase) return loadLocal()
      const { data, error } = await supabase
        .from('user_plans')
        .select('data')
        .eq('user_id', uid)
        .maybeSingle()
      if (error) throw error
      const plan = data?.data as Plan | null ?? null
      saveLocal(plan)
      return plan
    },
    initialData: loadLocal,
    staleTime: 30_000,
  })

  const savePlan = useMutation({
    mutationFn: async (plan: Plan) => {
      saveLocal(plan)
      if (!uid || !supabase) return plan
      const { error } = await supabase.from('user_plans').upsert(
        { user_id: uid, data: plan, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
      if (error) throw error
      return plan
    },
    onMutate: (plan) => {
      const key = uid ? planKeys.all(uid) : (['plan', 'offline'] as const)
      qc.setQueryData(key, plan)
    },
    onSettled: () => {
      if (uid) qc.invalidateQueries({ queryKey: planKeys.all(uid) })
    },
  })

  return {
    plan:      query.data ?? null,
    isLoading: query.isLoading,
    savePlan:  savePlan.mutateAsync,
    isSaving:  savePlan.isPending,
  }
}
