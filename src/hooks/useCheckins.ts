import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Checkin } from '@/types'
import { keys } from '@/lib/storage'
import { DEMO_CHECKINS } from '@/lib/demoData'

const LOCAL_KEY = keys.form.replace('form', 'checkins') // tr_checkins

// ── helpers ──────────────────────────────────────────────────────────────────

function loadLocal(): Checkin[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]') } catch { return [] }
}
function saveLocal(data: Checkin[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
}

async function fetchRemote(userId: string): Promise<Checkin[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('checkins')
    .select('app_id, date, weight, note')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  if (error) throw error
  return (data ?? []).map(r => ({
    id:     r.app_id ?? Date.now() + Math.floor(Math.random() * 1000),
    date:   r.date,
    weight: r.weight,
    note:   r.note ?? '',
  }))
}

// ── query key factory ─────────────────────────────────────────────────────────

export const checkinKeys = {
  all:      (uid: string) => ['checkins', uid] as const,
}

// ── main hook ─────────────────────────────────────────────────────────────────

export function useCheckins(user: User | null) {
  const qc = useQueryClient()
  const uid = user?.id ?? null

  const query = useQuery({
    queryKey: uid ? checkinKeys.all(uid) : ['checkins', 'offline'],
    queryFn: async () => {
      if (!uid) return DEMO_CHECKINS
      const remote = await fetchRemote(uid)
      saveLocal(remote)
      return remote
    },
    placeholderData: () => uid ? (loadLocal().length ? loadLocal() : undefined) : DEMO_CHECKINS,
    staleTime: 30_000,
  })

  const addCheckin = useMutation({
    mutationFn: async (entry: Omit<Checkin, 'id'> & { id?: number }) => {
      const id = entry.id ?? Date.now()
      const checkin: Checkin = { ...entry, id }
      if (uid && supabase) {
        const { error } = await supabase.from('checkins').upsert(
          { user_id: uid, date: checkin.date, weight: checkin.weight, note: checkin.note, app_id: checkin.id },
          { onConflict: 'user_id,date' }
        )
        if (error) throw error
      }
      return checkin
    },
    onMutate: async (entry) => {
      await qc.cancelQueries({ queryKey: uid ? checkinKeys.all(uid) : ['checkins', 'offline'] })
      const key = uid ? checkinKeys.all(uid) : (['checkins', 'offline'] as const)
      const prev = qc.getQueryData<Checkin[]>(key) ?? []
      const id = entry.id ?? Date.now()
      const next = [...prev.filter(c => c.date !== entry.date), { ...entry, id }]
        .sort((a, b) => a.date.localeCompare(b.date))
      qc.setQueryData(key, next)
      saveLocal(next)
      return { prev, key }
    },
    onError: (_err, _entry, ctx) => {
      if (ctx) { qc.setQueryData(ctx.key, ctx.prev); saveLocal(ctx.prev) }
    },
    onSettled: () => {
      if (uid) qc.invalidateQueries({ queryKey: checkinKeys.all(uid) })
    },
  })

  const deleteCheckin = useMutation({
    mutationFn: async (date: string) => {
      if (uid && supabase) {
        const { error } = await supabase.from('checkins').delete()
          .eq('user_id', uid).eq('date', date)
        if (error) throw error
      }
    },
    onMutate: async (date) => {
      const key = uid ? checkinKeys.all(uid) : (['checkins', 'offline'] as const)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Checkin[]>(key) ?? []
      const next = prev.filter(c => c.date !== date)
      qc.setQueryData(key, next)
      saveLocal(next)
      return { prev, key }
    },
    onError: (_err, _date, ctx) => {
      if (ctx) { qc.setQueryData(ctx.key, ctx.prev); saveLocal(ctx.prev) }
    },
    onSettled: () => {
      if (uid) qc.invalidateQueries({ queryKey: checkinKeys.all(uid) })
    },
  })

  return {
    checkins:     query.data ?? [],
    isLoading:    query.isLoading,
    addCheckin:   addCheckin.mutateAsync,
    deleteCheckin: deleteCheckin.mutateAsync,
    isAdding:     addCheckin.isPending,
    isDeleting:   deleteCheckin.isPending,
  }
}
