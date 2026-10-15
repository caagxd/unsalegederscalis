import type { Repo } from './repo'
import { LocalRepo } from './localRepo'
import { SupabaseRepo } from './supabaseRepo'

// Elle eklenen VITE_* adları ya da Vercel'in Supabase entegrasyonunun oluşturduğu NEXT_PUBLIC_* adları.
// Yalnızca tarayıcıya açık olması güvenli (publishable/anon) anahtarlar okunur; secret/service_role asla.
const env = import.meta.env
const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) as string | undefined
const key = (
  env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string | undefined

export const repo: Repo = url && key ? new SupabaseRepo(url, key) : new LocalRepo()
