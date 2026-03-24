import { useEffect, useState } from 'react'
import { useTimerStore } from '../store/timer.store'
import { calculateAvailableYearTime } from '../utils/yearCalc'

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

const TIMER_TYPES = ['work', 'study', 'break']

export default function Timer() {
  const { activeSession, elapsed, loading, fetchActive, start, pause, stop } = useTimerStore()
  const [type, setType] = useState('work')
  const [yearData] = useState(() => calculateAvailableYearTime())

  useEffect(() => {
    fetchActive()
  }, [fetchActive])

  const isActive = !!activeSession && !activeSession.paused
  const isPaused = !!activeSession?.paused

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Timer</h2>

      {/* Main timer */}
      <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 text-center">
        <div className="text-7xl font-mono font-bold text-white mb-6 tracking-tight">
          {fmt(elapsed)}
        </div>

        {!activeSession && (
          <div className="flex justify-center gap-2 mb-6">
            {TIMER_TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                  type === t ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-center gap-3">
          {!activeSession && (
            <button
              onClick={() => start(type)}
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              ▶ Start
            </button>
          )}
          {isActive && (
            <button
              onClick={pause}
              className="px-8 py-3 bg-yellow-600 hover:bg-yellow-500 text-white font-medium rounded-xl transition-colors"
            >
              ⏸ Pause
            </button>
          )}
          {isPaused && (
            <button
              onClick={() => start(activeSession!.type)}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
            >
              ▶ Resume
            </button>
          )}
          {activeSession && (
            <button
              onClick={stop}
              className="px-8 py-3 bg-red-700 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
            >
              ■ Stop
            </button>
          )}
        </div>

        {activeSession && (
          <p className="mt-4 text-sm text-gray-400 capitalize">
            {activeSession.paused ? 'Paused' : 'Running'} · {activeSession.type} session
          </p>
        )}
      </div>

      {/* Countdown cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Free Hours Today</p>
          <p className="text-4xl font-bold text-indigo-400">{yearData.productiveHoursPerDay.toFixed(1)}</p>
          <p className="text-xs text-gray-500 mt-1">hours available</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Days Left in Month</p>
          <p className="text-4xl font-bold text-yellow-400">{yearData.daysLeftInMonth}</p>
          <p className="text-xs text-gray-500 mt-1">{yearData.remainingMonthFreeHours}h free remaining</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Days Left in {yearData.year}</p>
          <p className="text-4xl font-bold text-red-400">{yearData.daysLeftInYear}</p>
          <p className="text-xs text-gray-500 mt-1">{yearData.remainingFreeHoursInYear}h free remaining</p>
        </div>
      </div>
    </div>
  )
}
