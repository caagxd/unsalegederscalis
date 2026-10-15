import type { Repo } from './repo'
import { LocalRepo } from './localRepo'
import { SupabaseRepo } from './supabaseRepo'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const repo: Repo = url && key ? new SupabaseRepo(url, key) : new LocalRepo()
