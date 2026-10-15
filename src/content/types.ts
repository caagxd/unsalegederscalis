// İçerik şeması. Her ders src/content/<ders-id>.json dosyasında bu şekilde tutulur.

export type SubjectId = 'turkce' | 'matematik' | 'fen' | 'inkilap' | 'din' | 'ingilizce'

export interface Question {
  id: string // "<topicId>-q1"
  stem: string // soru kökü; satır sonu için \n
  choices: [string, string, string, string] // A, B, C, D
  answer: 0 | 1 | 2 | 3
  explanation: string // adım adım çözüm
  difficulty: 1 | 2 | 3 // 1 kolay, 2 orta, 3 LGS zorluğu
  verified: boolean // içerik ilk üretimde false; ebeveyn kontrol edince true
}

export interface Topic {
  id: string // "<ders>-<ünite no>-<konu no>", ör. "matematik-1-2"
  name: string
  kazanim: string[] // MEB kazanım kodu + metni, ör. "M.8.1.1.1. Verilen pozitif tam sayıların çarpanlarını bulur..."
  summary: string // 150–300 kelime konu anlatımı; **kalın**, satır başı "- " madde destekli
  keyPoints: string[] // 3–6 ezber/dikkat noktası
  commonMistakes: string[] // 2–4 sık yapılan hata
  questions: Question[] // 5–10 soru
}

export interface Unit {
  id: string // "<ders>-<ünite no>"
  no: number
  name: string
  topics: Topic[]
}

export interface Subject {
  id: SubjectId
  name: string
  lgsQuestionCount: number // LGS'deki soru sayısı
  units: Unit[]
}
