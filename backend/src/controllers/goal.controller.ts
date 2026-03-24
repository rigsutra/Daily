import { Response } from 'express'
import { goalService } from '../services/goal.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const goalController = {
  async getGoals(req: AuthRequest, res: Response) {
    const goals = await goalService.getGoals(req.userId!)
    res.json(goals)
  },

  async createGoal(req: AuthRequest, res: Response) {
    try {
      const goal = await goalService.createGoal(req.userId!, req.body)
      res.status(201).json(goal)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async updateProgress(req: AuthRequest, res: Response) {
    try {
      const goal = await goalService.updateProgress(Number(req.params.id), req.body.achievedHours)
      res.json(goal)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },
}
