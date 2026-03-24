import { useEffect, useState } from 'react'
import { goalsApi } from '../api/goals'
import { Goal } from '../types'

const PERIOD_COLORS: Record<string, string> = {
  weekly: 'text-blue-400 bg-blue-950',
  monthly: 'text-yellow-400 bg-yellow-950',
  yearly: 'text-purple-400 bg-purple-950',
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', period: 'weekly', targetHours: '' })
  const [error, setError] = useState('')

  async function load() {
    const g = await goalsApi.getAll()
    setGoals(g)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await goalsApi.create({ ...form, targetHours: Number(form.targetHours) })
      setForm({ title: '', period: 'weekly', targetHours: '' })
      setShowForm(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed')
    }
  }

  const byPeriod = { weekly: goals.filter(g => g.period === 'weekly'), monthly: goals.filter(g => g.period === 'monthly'), yearly: goals.filter(g => g.period === 'yearly') }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Goals</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
          + New Goal
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">New Goal</h3>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Goal title"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.period}
              onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <input
              type="number"
              value={form.targetHours}
              onChange={e => setForm(f => ({ ...f, targetHours: e.target.value }))}
              placeholder="Target hours"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg hover:text-white transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {(['weekly', 'monthly', 'yearly'] as const).map(period => (
        <div key={period}>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 capitalize">{period} Goals</h3>
          {byPeriod[period].length === 0 ? (
            <p className="text-sm text-gray-600">No {period} goals yet.</p>
          ) : (
            <div className="space-y-3">
              {byPeriod[period].map(goal => {
                const pct = goal.targetHours > 0 ? Math.min(100, Math.round((goal.achievedHours / goal.targetHours) * 100)) : 0
                const statusColor = goal.status === 'completed' ? 'text-green-400' : goal.status === 'failed' ? 'text-red-400' : 'text-gray-400'
                return (
                  <div key={goal.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-medium">{goal.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{goal.achievedHours}h / {goal.targetHours}h</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${PERIOD_COLORS[goal.period]}`}>{period}</span>
                        <span className={`text-xs capitalize ${statusColor}`}>{goal.status}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${goal.status === 'completed' ? 'bg-green-500' : goal.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{pct}% complete</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
