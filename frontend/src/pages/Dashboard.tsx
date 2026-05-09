import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '../api/dashboard'
import StatCard from '../components/StatCard'
import { DailyDashboard } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [daily, setDaily] = useState<DailyDashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const dailyResult = await dashboardApi.daily()
      setDaily(dailyResult)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>

  const hoursUsedPct = daily ? Math.round((daily.hoursUsed / daily.totalHours) * 100) : 0
  const isWeekday = [1, 2, 3, 4, 5].includes(new Date().getDay())

  const pieData = daily
    ? [
        { name: 'Work', value: daily.workHours },
        { name: 'Study', value: daily.studyHours },
        { name: 'Tasks', value: daily.taskHours },
        { name: 'Timer', value: daily.timerHours },
        { name: 'Sleep', value: daily.sleepHours },
        { name: 'Free', value: Math.max(0, daily.hoursRemaining) },
      ].filter(d => d.value > 0)
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Daily Dashboard</h2>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* 24h progress bar */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>{isWeekday ? 'Free Time Today (5.5h available)' : '24 Hour Progress'}</span>
          <span>{hoursUsedPct}% used</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-3">
          <div
            className="bg-indigo-600 h-3 rounded-full transition-all"
            style={{ width: `${hoursUsedPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>{daily?.hoursUsed.toFixed(1)}h used</span>
          <span>{daily?.hoursRemaining.toFixed(1)}h remaining</span>
        </div>
      </div>

      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Productivity Score" value={`${daily?.productivityScore ?? 0}%`} color="indigo" />
        <StatCard label="Work Hours" value={`${daily?.workHours ?? 0}h`} color="green" />
        <StatCard label="Study Hours" value={`${daily?.studyHours ?? 0}h`} color="blue" />
        <StatCard
          label="Tasks"
          value={`${daily?.completedTasks ?? 0}/${daily?.totalTasks ?? 0}`}
          sub="completed"
          color="green"
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Gym"
          value={daily?.gymCompleted ? '✓ Done' : '✗ Not Done'}
          color={daily?.gymCompleted ? 'green' : 'yellow'}
        />
        <StatCard label="Water" value={`${daily?.waterLiters ?? 0}L`} sub="target: 4L" color="blue" />
        <StatCard label="Sleep" value={`${daily?.sleepHours ?? 0}h`} sub="target: 7.5h" color="purple" />
      </div>

      {/* Time distribution chart */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Today's Time Distribution</h3>
        {pieData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value.toFixed(1)}h`}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}h` : v} contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No data yet — start tracking</div>
        )}
      </div>
    </div>
  )
}
