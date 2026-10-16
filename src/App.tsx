import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './app/AppProvider'
import { BottomNav } from './components/BottomNav'
import { repo } from './lib/db'
import { isDue } from './lib/srs'
import Login from './pages/Login'
import Today from './pages/student/Today'
import Subjects from './pages/student/Subjects'
import SubjectDetail from './pages/student/SubjectDetail'
import TopicPage from './pages/student/TopicPage'
import WrongBank from './pages/student/WrongBank'
import Exams from './pages/student/Exams'
import Plan from './pages/student/Plan'
import PastPapers from './pages/student/PastPapers'
import More from './pages/student/More'
import ParentHome from './pages/parent/ParentHome'
import ParentWrong from './pages/parent/ParentWrong'
import ParentExams from './pages/parent/ParentExams'
import ParentQuestions from './pages/parent/ParentQuestions'
import ParentSettings from './pages/parent/ParentSettings'
import ScreenTimePage from './pages/ScreenTimePage'
import MixedTest from './pages/student/MixedTest'
import { FocusTimerPill } from './components/FocusTimer'

function Splash({ text = 'Yükleniyor…' }: { text?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-slate-400">
      <img src="/icon.svg" alt="" className="h-16 w-16 animate-pulse" />
      <span className="font-semibold">{text}</span>
    </div>
  )
}

function DemoBanner() {
  if (repo.mode !== 'demo') return null
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs font-semibold text-amber-800">
      Demo modu — veriler yalnızca bu cihazda. Aile takibi için Supabase kurulumu gerekli (README).
    </div>
  )
}

function Toast() {
  const { toast } = useApp()
  if (!toast) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[60] flex justify-center px-4">
      <div className="animate-pop rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white shadow-xl">{toast}</div>
    </div>
  )
}

export default function App() {
  const { profile, authLoading, data } = useApp()
  if (authLoading) return <Splash />
  if (!profile) return <><DemoBanner /><Login /></>
  if (!data) return <Splash text="Veriler getiriliyor…" />

  if (profile.role === 'parent') {
    const due = data.wrong.filter(isDue).length
    return (
      <>
        <DemoBanner />
        <Routes>
          <Route path="/veli" element={<ParentHome />} />
          <Route path="/veli/yanlislar" element={<ParentWrong />} />
          <Route path="/veli/denemeler" element={<ParentExams />} />
          <Route path="/veli/sorular" element={<ParentQuestions />} />
          <Route path="/veli/ayarlar" element={<ParentSettings />} />
          <Route path="/veli/ekran" element={<ScreenTimePage />} />
          <Route path="/ders/:subjectId" element={<SubjectDetail />} />
          <Route path="/konu/:topicId" element={<TopicPage />} />
          <Route path="/program" element={<Plan />} />
          <Route path="*" element={<Navigate to="/veli" replace />} />
        </Routes>
        <BottomNav items={[
          { to: '/veli', label: 'Özet', icon: '📊' },
          { to: '/veli/yanlislar', label: 'Yanlışlar', icon: '📸', badge: due },
          { to: '/veli/denemeler', label: 'Denemeler', icon: '📝' },
          { to: '/veli/sorular', label: 'İçerik', icon: '✅' },
          { to: '/veli/ayarlar', label: 'Ayarlar', icon: '⚙️' },
        ]} />
        <Toast />
      </>
    )
  }

  const due = data.wrong.filter(isDue).length
  const unseen = data.notes.filter((n) => !n.seen).length
  return (
    <>
      <DemoBanner />
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/dersler" element={<Subjects />} />
        <Route path="/ders/:subjectId" element={<SubjectDetail />} />
        <Route path="/ders/:subjectId/test" element={<MixedTest />} />
        <Route path="/konu/:topicId" element={<TopicPage />} />
        <Route path="/yanlislar" element={<WrongBank />} />
        <Route path="/denemeler" element={<Exams />} />
        <Route path="/program" element={<Plan />} />
        <Route path="/cikmis" element={<PastPapers />} />
        <Route path="/daha" element={<More />} />
        <Route path="/ekran" element={<ScreenTimePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav items={[
        { to: '/', label: 'Bugün', icon: '🏠' },
        { to: '/dersler', label: 'Dersler', icon: '📚' },
        { to: '/yanlislar', label: 'Yanlışlar', icon: '📸', big: true, badge: due },
        { to: '/denemeler', label: 'Denemeler', icon: '📝' },
        { to: '/daha', label: 'Ben', icon: '🙂', badge: unseen },
      ]} />
      <FocusTimerPill />
      <Toast />
    </>
  )
}
