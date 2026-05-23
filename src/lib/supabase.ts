import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('[Trimly] Supabase env vars missing — running in offline mode')
}

export const supabase = (url && key) ? createClient(url, key) : null
