import { create } from 'zustand'
import { TimerSession } from '../types'
import { timerApi } from '../api/timer'

interface TimerState {
  activeSession: TimerSession | null
  elapsed: number
  intervalId: ReturnType<typeof setInterval> | null
  loading: boolean
  fetchActive: () => Promise<void>
  start: (type: string) => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
  tick: () => void
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeSession: null,
  elapsed: 0,
  intervalId: null,
  loading: false,

  tick: () => {
    const { activeSession } = get()
    if (activeSession && !activeSession.paused) {
      const start = new Date(activeSession.startTime).getTime()
      set({ elapsed: Math.floor((Date.now() - start) / 1000) })
    }
  },

  fetchActive: async () => {
    try {
      const session = await timerApi.getActive()
      set({ activeSession: session })
      if (session && !session.paused) {
        const start = new Date(session.startTime).getTime()
        set({ elapsed: Math.floor((Date.now() - start) / 1000) })
        const id = setInterval(get().tick, 1000)
        set({ intervalId: id })
      }
    } catch {}
  },

  start: async (type) => {
    set({ loading: true })
    try {
      const session = await timerApi.start(type)
      set({ activeSession: session, elapsed: 0 })
      const id = setInterval(get().tick, 1000)
      set({ intervalId: id })
    } finally {
      set({ loading: false })
    }
  },

  pause: async () => {
    const { intervalId } = get()
    if (intervalId) clearInterval(intervalId)
    const session = await timerApi.pause()
    set({ activeSession: session, intervalId: null })
  },

  stop: async () => {
    const { intervalId } = get()
    if (intervalId) clearInterval(intervalId)
    await timerApi.stop()
    set({ activeSession: null, elapsed: 0, intervalId: null })
  },
}))
