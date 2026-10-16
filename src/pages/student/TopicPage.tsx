import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FocusTimerButton } from '../../components/FocusTimer'
import { LogModal } from '../../components/LogModal'
import { Quiz } from '../../components/Quiz'
import { TopicVideos } from '../../components/TopicVideos'
import { Empty, Page, PageHeader, RichText, UnverifiedBadge } from '../../components/ui'
import { SUBJECT_META, getTopic } from '../../lib/content'

type Tab = 'konu' | 'test' | 'video'

export default function TopicPage() {
  const { topicId } = useParams()
  const ref = getTopic(topicId)
  const [tab, setTab] = useState<Tab>('konu')
  const [logOpen, setLogOpen] = useState(false)
  if (!ref) return <><PageHeader title="Konu" back /><Page><Empty emoji="🤷" title="Konu bulunamadı" /></Page></>
  const { subject, unit, topic } = ref
  const m = SUBJECT_META[subject.id]

  const tabs: [Tab, string][] = [['konu', '📘 Konu'], ['test', `✏️ Alıştırma (${topic.questions.length})`], ['video', '🎬 Video']]

  return (
    <>
      <PageHeader title={topic.name} subtitle={`${m.emoji} ${subject.name} · ${unit.name}`} back />
      <Page>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-sm font-bold">
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-lg py-2 ${tab === k ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{l}</button>
          ))}
        </div>

        <FocusTimerButton topicId={topic.id} subject={subject.id} />

        {tab === 'konu' && (
          <>
            <section className="card space-y-3">
              <div className="flex flex-wrap gap-1">{!topic.questions.every((q) => q.verified) && <UnverifiedBadge />}</div>
              <RichText text={topic.summary} />
            </section>
            {topic.keyPoints.length > 0 && (
              <section className="card border-brand-100 bg-brand-50">
                <h3 className="mb-2 font-extrabold text-brand-700">🔑 Akılda tut</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">{topic.keyPoints.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </section>
            )}
            {topic.commonMistakes.length > 0 && (
              <section className="card border-rose-100 bg-rose-50">
                <h3 className="mb-2 font-extrabold text-rose-700">⚠️ Sık yapılan hatalar</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm">{topic.commonMistakes.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </section>
            )}
            {topic.kazanim.length > 0 && (
              <details className="card text-sm">
                <summary className="cursor-pointer font-bold text-slate-500">MEB kazanımları</summary>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{topic.kazanim.map((k, i) => <li key={i}>{k}</li>)}</ul>
              </details>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" onClick={() => setTab('video')}>🎬 Videoyla izle</button>
              <button className="btn-primary" onClick={() => setTab('test')}>Alıştırmaya geç →</button>
            </div>
          </>
        )}
        {tab === 'test' && <Quiz key={topic.id} pool={topic.questions} />}
        {tab === 'video' && <TopicVideos refT={ref} />}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn-ghost text-sm" onClick={() => setLogOpen(true)}>➕ Kitaptan çözdüklerim</button>
          <Link to={`/yanlislar?konu=${topic.id}`} className="btn-ghost text-sm">📸 Yanlış ekle</Link>
        </div>
      </Page>
      {logOpen && <LogModal open onClose={() => setLogOpen(false)} preset={{ subject: subject.id, topicId: topic.id }} />}
    </>
  )
}
