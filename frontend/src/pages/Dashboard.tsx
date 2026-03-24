import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { dashboardApi } from '../api/dashboard'
import { mobileApi } from '../api/mobile'
import StatCard from '../components/StatCard'
import { DailyDashboard, MobileUsageData } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

export default function Dashboard() {
  const [daily, setDaily] = useState<DailyDashboard | null>(null)
  const [mobile, setMobile] = useState<MobileUsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [d, m] = await Promise.all([dashboardApi.daily(), mobileApi.today()])
        setDaily(d)
        setMobile(m)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-gray-400">Loading…</div>

  const hoursUsedPct = daily ? Math.round((daily.hoursUsed / 24) * 100) : 0
  const mobileHours = mobile ? (mobile.totalMinutes / 60).toFixed(1) : '0'

  const pieData = daily
    ? [
        { name: 'Work', value: daily.workHours },
        { name: 'Study', value: daily.studyHours },
        { name: 'Mobile', value: +(mobile?.totalMinutes ?? 0) / 60 },
        { name: 'Sleep', value: daily.sleepHours },
        { name: 'Free', value: Math.max(0, daily.hoursRemaining - (mobile?.totalMinutes ?? 0) / 60) },
      ].filter(d => d.value > 0)
    : []

  const topApps = mobile?.apps.slice(0, 6) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Daily Dashboard</h2>
        <span className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>

      {/* 24h progress bar */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>24 Hour Progress</span>
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Productivity Score" value={`${daily?.productivityScore ?? 0}%`} color="indigo" />
        <StatCard label="Work Hours" value={`${daily?.workHours ?? 0}h`} color="green" />
        <StatCard label="Study Hours" value={`${daily?.studyHours ?? 0}h`} color="blue" />
        <StatCard label="Mobile Usage" value={`${mobileHours}h`} color="red" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gym"
          value={daily?.gymCompleted ? '✓ Done' : '✗ Not Done'}
          color={daily?.gymCompleted ? 'green' : 'yellow'}
        />
        <StatCard label="Water" value={`${daily?.waterLiters ?? 0}L`} sub="target: 4L" color="blue" />
        <StatCard label="Sleep" value={`${daily?.sleepHours ?? 0}h`} sub="target: 7.5h" color="purple" />
        <StatCard
          label="Tasks"
          value={`${daily?.completedTasks ?? 0}/${daily?.totalTasks ?? 0}`}
          sub="completed"
          color="green"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h3 className="text-sm font-medium text-gray-300 mb-4">Top Apps Today</h3>
          {topApps.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topApps} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis type="category" dataKey="appName" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }} />
                <Bar dataKey="minutesUsed" name="Minutes" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No mobile data — sync from your phone</div>
          )}
        </div>
      </div>
    </div>
  )
}
