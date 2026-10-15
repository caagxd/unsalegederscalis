import { useData } from '../../app/AppProvider'
import { ExamCharts } from '../../components/ExamCharts'
import { Empty, Page, PageHeader } from '../../components/ui'
import { ExamList } from '../student/Exams'

export default function ParentExams() {
  const d = useData()
  return (
    <>
      <PageHeader title="Denemeler" subtitle={`${d.exams.length} deneme`} />
      <Page>
        {d.exams.length === 0 ? <Empty emoji="📝" title="Henüz deneme girilmemiş">Öğrenci denemeleri kendi ekranından girer.</Empty> : (
          <>
            <section className="card"><ExamCharts exams={d.exams} /></section>
            <ExamList exams={[...d.exams].reverse()} />
          </>
        )}
      </Page>
    </>
  )
}
