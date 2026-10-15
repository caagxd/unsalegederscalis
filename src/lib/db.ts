import type { Repo } from './repo'
import { LocalRepo } from './localRepo'
import { SupabaseRepo } from './supabaseRepo'

// Supabase'in herkese açık bağlantı bilgileri. Publishable anahtar tarayıcıya gömülmek için tasarlanmıştır;
// veriyi koruyan şey RLS kurallarıdır (supabase/migrations). Secret/service_role anahtar ASLA buraya yazılmaz.
const DEFAULT_URL = 'https://fljftbkkyyuvlzcqxahb.supabase.co'
const DEFAULT_KEY = 'sb_publishable_bt9mfhVau5yZEUQGcNhDyw_VG4WIXbC'

// Öncelik: elle eklenen VITE_* → Vercel entegrasyonunun NEXT_PUBLIC_* adları → üretimde varsayılanlar.
// Geliştirmede (npm run dev) değişken yoksa demo modu açılır, gerçek veritabanına dokunulmaz.
const env = import.meta.env
const url = (env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || (env.PROD ? DEFAULT_URL : '')) as string
const key = (
  env.VITE_SUPABASE_ANON_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (env.PROD ? DEFAULT_KEY : '')
) as string

export const repo: Repo = url && key && env.VITE_DEMO !== '1' ? new SupabaseRepo(url, key) : new LocalRepo()
