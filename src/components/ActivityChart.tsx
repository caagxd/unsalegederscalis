import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addDays, shortDate, today } from '../lib/dates'
import { daySummaries } from '../lib/stats'
import type { DailyLog, QuizAttempt } from '../lib/types'

export function ActivityChart({ logs, attempts, days = 14 }: { logs: DailyLog[]; attempts: QuizAttempt[]; days?: number }) {
  const data = daySummaries(logs, attempts, addDays(today(), -(days - 1)), today()).map((s) => ({ ...s, label: shortDate(s.date) }))
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ left: -24, right: 4, top: 8 }}>
        <CartesianGrid stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={Math.ceil(days / 7) - 1} />
        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="correct" name="Doğru" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
        <Bar dataKey="wrong" name="Yanlış" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
