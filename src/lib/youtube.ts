/** youtube.com/watch?v=, youtu.be/, /shorts/, /embed/ ya da çıplak 11 karakterlik id */
export function parseYoutubeId(input: string): string | null {
  const s = input.trim()
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  try {
    const u = new URL(s)
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1, 12) || null
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v')
      if (v) return v.slice(0, 11)
      const m = u.pathname.match(/\/(shorts|embed|live)\/([A-Za-z0-9_-]{11})/)
      if (m) return m[2]
    }
  } catch { /* geçersiz URL */ }
  return null
}
