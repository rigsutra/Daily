import { Response } from 'express'
import { goalRepository } from '../repositories/goal.repository.js'
import { goalProgressService } from '../services/goalProgress.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const goalProgressController = {
  async updateAllGoals(req: AuthRequest, res: Response) {
    try {
      const result = await goalProgressService.updateAllGoalsProgress(req.userId!)
      res.json(result)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async updateFromTimers(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.body
      const result = await goalProgressService.updateGoalsFromTimerSessions(
        req.userId!,
        new Date(startDate),
        new Date(endDate)
      )
      res.json(result)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async updateFromTasks(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.body
      const result = await goalProgressService.updateGoalsFromTaskCompletions(
        req.userId!,
        new Date(startDate),
        new Date(endDate)
      )
      res.json(result)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async getGoalProgress(req: AuthRequest, res: Response) {
    try {
      const progress = await goalProgressService.getGoalProgress(
        req.userId!,
        Number(req.params.goalId)
      )
      res.json(progress)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async updateGoalProgress(req: AuthRequest, res: Response) {
    try {
      const { achievedHours } = req.body
      const goal = await goalProgressService.getGoalProgress(req.userId!, Number(req.params.goalId))
      const status = achievedHours >= goal.targetHours ? 'completed' : 'active'
      const updatedGoal = await goalRepository.update(Number(req.params.goalId), { achievedHours, status })
      res.json(updatedGoal)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  }
}