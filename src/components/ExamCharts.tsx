import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SUBJECT_IDS, SUBJECT_META } from '../lib/content'
import { shortDate } from '../lib/dates'
import { examTrend } from '../lib/stats'
import type { Exam } from '../lib/types'

export function ExamCharts({ exams }: { exams: Exam[] }) {
  if (exams.length < 2) return <p className="text-sm text-slate-400">Grafik için en az 2 deneme gir.</p>
  const data = examTrend(exams).map((e) => ({ ...e, label: shortDate(e.date) }))
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-1 text-sm font-bold text-slate-500">Ağırlıklı net (en fazla 270)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 270]} />
            <Tooltip formatter={(v) => [v, 'Ağırlıklı net']} labelFormatter={(_, p) => p?.[0]?.payload?.name ?? ''} />
            <Line type="monotone" dataKey="weighted" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-bold text-slate-500">Ders netleri</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
            <CartesianGrid stroke="#f1f5f9" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 20]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {SUBJECT_IDS.map((id) => (
              <Line key={id} type="monotone" dataKey={id} name={SUBJECT_META[id].short} stroke={SUBJECT_META[id].color} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
