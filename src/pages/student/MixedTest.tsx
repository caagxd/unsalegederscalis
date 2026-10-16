import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useData } from '../../app/AppProvider'
import { Quiz } from '../../components/Quiz'
import { Empty, Page, PageHeader } from '../../components/ui'
import type { SubjectId } from '../../content/types'
import { SUBJECT_META, getSubject } from '../../lib/content'

// Bir dersin, okulda işlenmiş ünitelerinden karışık sorular (tekrar etmeyen 10'luk turlar).
export default function MixedTest() {
  const { subjectId } = useParams()
  const d = useData()
  const s = getSubject(subjectId as SubjectId)
  const limit = s ? d.settings.school_progress?.[s.id] : undefined
  const pool = useMemo(
    () => s?.units.filter((u) => !limit || u.no <= limit).flatMap((u) => u.topics.flatMap((t) => t.questions)) ?? [],
    [s, limit],
  )
  if (!s) return <><PageHeader title="Karma test" back /><Page><Empty emoji="🤷" title="Ders bulunamadı" /></Page></>
  return (
    <>
      <PageHeader title={`${SUBJECT_META[s.id].emoji} ${s.name} · Karma test`} subtitle={limit ? `Okulda işlenen ${limit}. üniteye kadar · ${pool.length} soru` : `Tüm üniteler · ${pool.length} soru`} back />
      <Page>
        <Quiz key={s.id} pool={pool} showTopic />
      </Page>
    </>
  )
}
