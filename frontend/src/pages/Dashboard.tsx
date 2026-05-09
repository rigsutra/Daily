import { useEffect, useState, useCallback } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { dashboardApi } from '../api/dashboard'
import StatCard from '../components/StatCard'
import { DailyDashboard } from '../types'

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']

interface DailyForm {
  workHours: number
  studyHours: number
  gymCompleted: boolean
  waterLiters: number
  sleepHours: number
}

export default function Dashboard() {
  const [daily, setDaily] = useState<DailyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<DailyForm>({
    workHours: 0, studyHours: 0, gymCompleted: false, waterLiters: 0, sleepHours: 0,
  })

  useEffect(() => {
    async function load() {
      const dailyResult = await dashboardApi.daily()
      setDaily(dailyResult)
      setForm({
        workHours: dailyResult.workHours ?? 0,
        studyHours: dailyResult.studyHours ?? 0,
        gymCompleted: dailyResult.gymCompleted ?? false,
        waterLiters: dailyResult.waterLiters ?? 0,
        sleepHours: dailyResult.sleepHours ?? 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const save = useCallback(async (patch: Partial<DailyForm>) => {
    const next = { ...form, ...patch }
    setForm(next)
    const entry = await dashboardApi.updateDaily(next)
    setDaily(prev => prev ? {
      ...prev,
      workHours: entry.workHours,
      studyHours: entry.studyHours,
      gymCompleted: entry.gymCompleted,
      waterLiters: entry.waterLiters,
      sleepHours: entry.sleepHours,
    } : prev)
  }, [form])

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold text-white">Daily Dashboard</h2>
        <span className="text-sm text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Productivity Score" value={`${daily?.productivityScore ?? 0}%`} color="indigo" />

        {/* Work Hours — editable */}
        <div className="bg-gray-900 rounded-xl p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Work Hours</p>
          <div className="flex items-baseline gap-1 mt-1">
            <input
              type="number" min="0" max="24" step="0.5"
              value={form.workHours}
              onChange={e => setForm(f => ({ ...f, workHours: Number(e.target.value) }))}
              onBlur={() => save({ workHours: form.workHours })}
              className="text-2xl font-bold text-white bg-transparent w-20 outline-none border-b border-transparent focus:border-gray-600"
            />
            <span className="text-sm text-gray-400">h</span>
          </div>
        </div>

        {/* Study Hours — editable */}
        <div className="bg-gray-900 rounded-xl p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Study Hours</p>
          <div className="flex items-baseline gap-1 mt-1">
            <input
              type="number" min="0" max="24" step="0.5"
              value={form.studyHours}
              onChange={e => setForm(f => ({ ...f, studyHours: Number(e.target.value) }))}
              onBlur={() => save({ studyHours: form.studyHours })}
              className="text-2xl font-bold text-white bg-transparent w-20 outline-none border-b border-transparent focus:border-gray-600"
            />
            <span className="text-sm text-gray-400">h</span>
          </div>
        </div>

        <StatCard
          label="Tasks"
          value={`${daily?.completedTasks ?? 0}/${daily?.totalTasks ?? 0}`}
          sub="completed"
          color="green"
        />
      </div>

      {/* Stat cards — row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Gym — toggle */}
        <div
          role="button"
          onClick={() => save({ gymCompleted: !form.gymCompleted })}
          className={`bg-gray-900 rounded-xl p-4 border-l-4 cursor-pointer transition-colors ${form.gymCompleted ? 'border-green-500' : 'border-yellow-500'}`}
        >
          <p className="text-xs text-gray-400 uppercase tracking-wider">Gym</p>
          <p className="text-2xl font-bold text-white mt-1">{form.gymCompleted ? '✓ Done' : '✗ Not Done'}</p>
          <p className="text-xs text-gray-500 mt-1">tap to toggle</p>
        </div>

        {/* Water — editable */}
        <div className="bg-gray-900 rounded-xl p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Water</p>
          <div className="flex items-baseline gap-1 mt-1">
            <input
              type="number" min="0" max="20" step="0.25"
              value={form.waterLiters}
              onChange={e => setForm(f => ({ ...f, waterLiters: Number(e.target.value) }))}
              onBlur={() => save({ waterLiters: form.waterLiters })}
              className="text-2xl font-bold text-white bg-transparent w-20 outline-none border-b border-transparent focus:border-gray-600"
            />
            <span className="text-sm text-gray-400">L</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">target: 4L</p>
        </div>

        {/* Sleep — editable */}
        <div className="bg-gray-900 rounded-xl p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Sleep</p>
          <div className="flex items-baseline gap-1 mt-1">
            <input
              type="number" min="0" max="24" step="0.5"
              value={form.sleepHours}
              onChange={e => setForm(f => ({ ...f, sleepHours: Number(e.target.value) }))}
              onBlur={() => save({ sleepHours: form.sleepHours })}
              className="text-2xl font-bold text-white bg-transparent w-20 outline-none border-b border-transparent focus:border-gray-600"
            />
            <span className="text-sm text-gray-400">h</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">target: 7.5h</p>
        </div>
      </div>

      {/* Time distribution chart */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Today's Time Distribution</h3>
        {pieData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v) => typeof v === 'number' ? `${v.toFixed(1)}h` : v}
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend below chart — more readable on all screen sizes */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
              {pieData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  {d.name}: {d.value.toFixed(1)}h
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-500 text-sm">No data yet — start tracking</div>
        )}
      </div>
    </div>
  )
}
