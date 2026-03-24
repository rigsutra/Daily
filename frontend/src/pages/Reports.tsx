import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { dashboardApi } from '../api/dashboard'
import { WeeklyDashboard, MonthlyDashboard } from '../types'
import StatCard from '../components/StatCard'

export default function Reports() {
  const [weekly, setWeekly] = useState<WeeklyDashboard | null>(null)
  const [monthly, setMonthly] = useState<MonthlyDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [w, m] = await Promise.all([dashboardApi.weekly(), dashboardApi.monthly()])
        setWeekly(w)
        setMonthly(m)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>

  const weeklyChartData = weekly?.entries.map((e: any, i: number) => ({
    day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i] ?? `Day ${i+1}`,
    work: e.workHours,
    study: e.studyHours,
    productive: e.productiveHours,
  })) ?? []

  const monthlyChartData = monthly?.entries.map((e: any) => ({
    date: new Date(e.date).getDate(),
    productive: e.productiveHours,
    work: e.workHours,
  })) ?? []

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Reports</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Weekly Work" value={`${weekly?.totalWorkHours.toFixed(1) ?? 0}h`} color="green" />
        <StatCard label="Weekly Study" value={`${weekly?.totalStudyHours.toFixed(1) ?? 0}h`} color="blue" />
        <StatCard label="Weekly Timer" value={`${weekly?.totalTimerHours.toFixed(1) ?? 0}h`} color="indigo" />
        <StatCard label="Monthly Avg/day" value={`${monthly?.avgProductiveHours.toFixed(1) ?? 0}h`} color="purple" />
      </div>

      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Weekly Breakdown</h3>
        {weeklyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
              <Bar dataKey="work" name="Work" fill="#22c55e" radius={[2,2,0,0]} />
              <Bar dataKey="study" name="Study" fill="#3b82f6" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No data this week yet</div>
        )}
      </div>

      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Monthly Productive Hours</h3>
        {monthlyChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
              <Line type="monotone" dataKey="productive" name="Productive hours" stroke="#6366f1" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No monthly data yet</div>
        )}
      </div>
    </div>
  )
}
