import { useEffect, useState } from 'react'
import { tasksApi } from '../api/tasks'
import { Task, TaskCompletion } from '../types'

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<TaskCompletion[]>([])
  const [showForm, setShowForm] = useState(false)
  const [showDelete, setShowDelete] = useState<number | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [form, setForm] = useState({ title: '', target: '', unit: '', mandatory: false })
  const [error, setError] = useState('')

  async function load() {
    const [t, c] = await Promise.all([tasksApi.getAll(), tasksApi.todayCompletions()])
    setTasks(t)
    setCompletions(c)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await tasksApi.create({ ...form, target: Number(form.target) })
      setForm({ title: '', target: '', unit: '', mandatory: false })
      setShowForm(false)
      load()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to create task')
    }
  }

  async function handleDelete() {
    if (!showDelete) return
    setError('')
    try {
      await tasksApi.delete(showDelete, deleteReason)
      setShowDelete(null)
      setDeleteReason('')
      load()
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to delete')
    }
  }

  async function handleComplete(taskId: number, achieved: number) {
    await tasksApi.complete(taskId, achieved)
    load()
  }

  const completionMap = Object.fromEntries(completions.map(c => [c.taskId, c]))
  const totalTasks = tasks.length
  const doneTasks = completions.filter(c => c.completed).length
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Task Board</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Progress */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Today's Progress</span>
          <span>{doneTasks}/{totalTasks} tasks · {pct}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-900 rounded-xl p-4 border border-gray-800 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">New Recurring Task</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Title (e.g. Gym)"
              className="col-span-2 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              type="number"
              value={form.target}
              onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
              placeholder="Target (e.g. 1)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              required
            />
            <input
              value={form.unit}
              onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
              placeholder="Unit (e.g. hour, liters)"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={form.mandatory}
              onChange={e => setForm(f => ({ ...f, mandatory: e.target.checked }))}
              className="rounded"
            />
            Mandatory
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors">
              Create
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg hover:text-white transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      <div className="space-y-3">
        {tasks.length === 0 && (
          <div className="text-center text-gray-500 py-12">No tasks yet. Create your first recurring task.</div>
        )}
        {tasks.map(task => {
          const comp = completionMap[task.id]
          const achieved = comp?.achieved ?? 0
          const done = comp?.completed ?? false
          return (
            <div key={task.id} className={`bg-gray-900 rounded-xl p-4 border ${done ? 'border-green-800' : 'border-gray-800'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${done ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                    {done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <div>
                    <p className="text-white font-medium">{task.title}</p>
                    <p className="text-xs text-gray-500">Target: {task.target} {task.unit}{task.mandatory ? ' · Mandatory' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={achieved || ''}
                    onChange={e => handleComplete(task.id, Number(e.target.value))}
                    placeholder="0"
                    className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-xs text-gray-500">{task.unit}</span>
                  <button
                    onClick={() => setShowDelete(task.id)}
                    className="text-gray-600 hover:text-red-400 text-sm ml-2 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-semibold text-white">Delete Task</h3>
            <p className="text-sm text-gray-400">
              You must provide a reason of at least <span className="text-red-400 font-medium">1000 characters</span> to delete this task.
            </p>
            <textarea
              value={deleteReason}
              onChange={e => setDeleteReason(e.target.value)}
              rows={6}
              placeholder="Explain why you're removing this task from your daily routine…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-indigo-500"
            />
            <p className={`text-xs ${deleteReason.length >= 1000 ? 'text-green-400' : 'text-gray-500'}`}>
              {deleteReason.length}/1000 characters
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleteReason.length < 1000}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white text-sm rounded-lg transition-colors"
              >
                Delete Task
              </button>
              <button onClick={() => { setShowDelete(null); setDeleteReason(''); setError('') }} className="px-4 py-2 bg-gray-800 text-gray-400 text-sm rounded-lg hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
