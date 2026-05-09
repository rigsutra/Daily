import { timerRepository } from '../repositories/timer.repository.js'
import { goalProgressService } from './goalProgress.service.js'
import { prisma } from '../db.js'

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
    const endTime = new Date()
    const duration = Math.floor((endTime.getTime() - active.startTime.getTime()) / 60000)
    
    console.log('Stopping timer:', { 
      startTime: active.startTime, 
      endTime, 
      duration 
    })
    
    // Update the timer session with end time and duration using direct Prisma update
    const updatedSession = await prisma.timerSession.update({
      where: { id: active.id },
      data: {
        endTime,
        duration
      }
    })
    
    console.log('Updated session:', updatedSession)
    
    // Update goal progress when timer is stopped
    if (active.type === 'work') {
      try {
        await goalProgressService.updateGoalsFromTimerSessions(
          userId,
          new Date(active.startTime),
          endTime
        )
      } catch (error) {
        console.error('Error updating goals from timer session:', error)
      }
    }
    
    return updatedSession
  },

  getActive: (userId: number) => timerRepository.findActiveByUser(userId),

  getTodaySessions: (userId: number) => {
    const today = new Date()
    return timerRepository.findByUserAndDate(userId, today)
  },
}
