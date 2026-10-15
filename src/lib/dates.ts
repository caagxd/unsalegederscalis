// Tarihler yerel saatle YYYY-MM-DD olarak tutulur.

export function toISODate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const today = () => toISODate(new Date())

export function addDays(iso: string, n: number) {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
}

/** Haftanın pazartesisi */
export function weekStart(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7
  return addDays(iso, -dow)
}

export const isWeekend = (iso: string) => {
  const d = new Date(iso + 'T00:00:00').getDay()
  return d === 0 || d === 6
}

const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

export const dayName = (iso: string) => DAYS[new Date(iso + 'T00:00:00').getDay()]
export function shortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
/** ISO zaman damgasını yerel tarihe çevirir */
export const localDate = (ts: string) => toISODate(new Date(ts))
