// İçerik dosyalarını şemaya göre denetler ve özet rapor basar.
// Kullanım: npm run validate
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const dir = new URL('../src/content/', import.meta.url).pathname
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
const errors = []
const ids = new Set()
let totals = { units: 0, topics: 0, questions: 0 }

const dup = (id) => { if (ids.has(id)) errors.push(`tekrarlanan id: ${id}`); ids.add(id) }

for (const f of files) {
  let s
  try { s = JSON.parse(readFileSync(join(dir, f), 'utf8')) } catch (e) { errors.push(`${f}: geçersiz JSON — ${e.message}`); continue }
  const answers = [0, 0, 0, 0]
  let q = 0, t = 0
  for (const u of s.units ?? []) {
    dup(u.id)
    for (const tp of u.topics ?? []) {
      dup(tp.id); t++
      if (!tp.summary || tp.summary.split(/\s+/).length < 80) errors.push(`${tp.id}: özet çok kısa`)
      if (!Array.isArray(tp.keyPoints) || !Array.isArray(tp.commonMistakes) || !Array.isArray(tp.kazanim)) errors.push(`${tp.id}: eksik alan`)
      if ((tp.questions ?? []).length < 5) errors.push(`${tp.id}: 5'ten az soru`)
      for (const x of tp.questions ?? []) {
        dup(x.id); q++
        if (!x.stem?.trim()) errors.push(`${x.id}: boş soru kökü`)
        if (!Array.isArray(x.choices) || x.choices.length !== 4) errors.push(`${x.id}: 4 şık değil`)
        else if (new Set(x.choices.map((c) => String(c).trim())).size !== 4) errors.push(`${x.id}: aynı şık iki kez`)
        if (![0, 1, 2, 3].includes(x.answer)) errors.push(`${x.id}: geçersiz cevap`)
        else answers[x.answer]++
        if (!x.explanation?.trim()) errors.push(`${x.id}: çözüm yok`)
        if (![1, 2, 3].includes(x.difficulty)) errors.push(`${x.id}: geçersiz zorluk`)
        if (typeof x.verified !== 'boolean') errors.push(`${x.id}: verified alanı yok`)
      }
    }
  }
  totals.units += s.units.length; totals.topics += t; totals.questions += q
  console.log(`${s.id.padEnd(10)} ${String(s.units.length).padStart(2)} ünite ${String(t).padStart(3)} konu ${String(q).padStart(4)} soru  cevap dağılımı A/B/C/D: ${answers.join('/')}`)
}
console.log(`TOPLAM     ${totals.units} ünite, ${totals.topics} konu, ${totals.questions} soru`)
if (errors.length) { console.error(`\n${errors.length} sorun:\n` + errors.map((e) => ' - ' + e).join('\n')); process.exit(1) }
console.log('✓ Şema denetimi temiz')
