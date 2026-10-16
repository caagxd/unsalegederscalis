// MEB'in yayımladığı LGS soru kitapçıkları (A kitapçığı).
// PDF'ler kopyalanmaz; her açılışta doğrudan MEB'in sunucusundan (cdn.eba.gov.tr) gösterilir.
// Burada yalnızca puanlama için cevap anahtarları tutulur (kitapçığın son sayfasından alındı).
import type { SubjectId } from './types'

export interface MebSection { subject: SubjectId; key: string }
export interface MebSession { id: 'sozel' | 'sayisal'; name: string; minutes: number; url: string; pages: number; sections: MebSection[] }
export interface MebExam { id: string; year: number; sessions: MebSession[] }

export const MEB_EXAMS: MebExam[] = [
  {
    id: '2026', year: 2026, sessions: [
      { id: 'sozel', name: 'Sözel Bölüm', minutes: 75, url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2026/06/trlgs/a_2026_sozel.pdf', pages: 33, sections: [
        { subject: 'turkce', key: 'ABDADCADABDCACDCBDCB' },
        { subject: 'inkilap', key: 'BDCACABDBC' },
        { subject: 'din', key: 'DCAACBDCAB' },
        { subject: 'ingilizce', key: 'DCADBBDACB' },
      ] },
      { id: 'sayisal', name: 'Sayısal Bölüm', minutes: 80, url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2026/06/trlgs/a_2026_sayisal.pdf', pages: 33, sections: [
        { subject: 'matematik', key: 'BBDCBCADDABDACACDBBC' },
        { subject: 'fen', key: 'CADBACBDBCBADCADBCAB' },
      ] },
    ],
  },
  {
    id: '2025', year: 2025, sessions: [
      { id: 'sozel', name: 'Sözel Bölüm', minutes: 75, url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2025/06/lgs/2025sozel.pdf', pages: 33, sections: [
        { subject: 'turkce', key: 'BACDCDBDCADCDABCCBAB' },
        { subject: 'inkilap', key: 'CADBADCBBD' },
        { subject: 'din', key: 'CDBBADBCAA' },
        { subject: 'ingilizce', key: 'ACDBCACDDB' },
      ] },
      { id: 'sayisal', name: 'Sayısal Bölüm', minutes: 80, url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2025/06/lgss/2025sayisal.pdf', pages: 33, sections: [
        { subject: 'matematik', key: 'DCCBADABDDBCCBBDACBA' },
        { subject: 'fen', key: 'ACDCBDADBCCBADACBCAD' },
      ] },
    ],
  },
  {
    id: '2024', year: 2024, sessions: [
      { id: 'sozel', name: 'Sözel Bölüm', minutes: 75, url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2024/06/2024sozel.pdf', pages: 25, sections: [
        { subject: 'turkce', key: 'ACDCADCBACBDAABCBDDC' },
        { subject: 'inkilap', key: 'ABADCDBCAB' },
        { subject: 'din', key: 'CDABCCBDBA' },
        { subject: 'ingilizce', key: 'BDADCBACCD' },
      ] },
      { id: 'sayisal', name: 'Sayısal Bölüm', minutes: 80, url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2024/06/2024sayisal.pdf', pages: 33, sections: [
        { subject: 'matematik', key: 'DBABBDAABBCDADCCDCBC' },
        { subject: 'fen', key: 'BDDABCDACDBACACDBABC' },
      ] },
    ],
  },
  {
    id: '2022', year: 2022, sessions: [
      { id: 'sozel', name: 'Sözel Bölüm', minutes: 75, url: 'https://cdn.eba.gov.tr/icerik/lgs/2022_sozel_bolum_a_kitapcigi_ve_cevap_anahtari.pdf', pages: 25, sections: [
        { subject: 'turkce', key: 'BDCADBCBADACBBCCADCB' },
        { subject: 'inkilap', key: 'ACDBCBACDD' },
        { subject: 'din', key: 'ACBADCBDAC' },
        { subject: 'ingilizce', key: 'DCABADBCBA' },
      ] },
      { id: 'sayisal', name: 'Sayısal Bölüm', minutes: 80, url: 'https://cdn.eba.gov.tr/icerik/lgs/2022_sayisal_bolum_a_kitapcigi_ve_cevap_anahtari.pdf', pages: 33, sections: [
        { subject: 'matematik', key: 'DABDCCABDACBDCBCDACB' },
        { subject: 'fen', key: 'DBCACBCDACDABBACBDAD' },
      ] },
    ],
  },
]

export const getMebSession = (examId: string, sessionId: string) =>
  MEB_EXAMS.find((e) => e.id === examId)?.sessions.find((s) => s.id === sessionId)

// LGS Çalışma Kitapları Seti (MEB, Nisan 2026): çıkmış sınav soruları ve örnek sorular, ders ders.
export const MEB_BOOKS: { id: string; title: string; desc: string; url: string }[] = [
  { id: 'turkce', title: 'Türkçe Çalışma Kitabı', desc: 'Çıkmış ve örnek Türkçe soruları', url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2026/04/lgscalismakitabi/lgs_turkce.pdf' },
  { id: 'matematik', title: 'Matematik Çalışma Kitabı', desc: 'Çıkmış ve örnek Matematik soruları', url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2026/04/lgscalismakitabi/lgs_matematik.pdf' },
  { id: 'fen', title: 'Fen Bilimleri Çalışma Kitabı', desc: 'Çıkmış ve örnek Fen soruları', url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2026/04/lgscalismakitabi/lgs_fen.pdf' },
  { id: 'sozel', title: 'Sözel Dersler Çalışma Kitabı', desc: 'İnkılap, Din Kültürü ve İngilizce', url: 'https://cdn.eba.gov.tr/yardimcikaynaklar/2026/04/lgscalismakitabi/lgs_sozel.pdf' },
]
