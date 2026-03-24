import { timerRepository } from '../repositories/timer.repository.js'

export const timerService = {
  async start(userId: number, type: string) {
    const active = await timerRepository.findActiveByUser(userId)
    if (active) throw new Error('A timer is already running. Stop it first.')
    return timerRepository.create({ userId, type, startTime: new Date() })
  },

  async pause(userId: number) {
    const active = await timerRepository.findActiveByUser(userId)
    if (!active) throw new Error('No active timer')
    const duration = Math.floor((Date.now() - active.startTime.getTime()) / 60000)
    return timerRepository.update(active.id, { paused: true, duration })
  },

  async stop(userId: number) {
    const active = await timerRepository.findActiveByUser(userId)
    if (!active) throw new Error('No active timer')
    const duration = Math.floor((Date.now() - active.startTime.getTime()) / 60000)
    return timerRepository.update(active.id, { endTime: new Date(), duration })
  },

  getActive: (userId: number) => timerRepository.findActiveByUser(userId),

  getTodaySessions: (userId: number) => {
    const today = new Date()
    return timerRepository.findByUserAndDate(userId, today)
  },
}
