import { Response } from 'express'
import { taskService } from '../services/task.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const taskController = {
  async getTasks(req: AuthRequest, res: Response) {
    const tasks = await taskService.getTasks(req.userId!)
    res.json(tasks)
  },

  async createTask(req: AuthRequest, res: Response) {
    try {
      const task = await taskService.createTask(req.userId!, req.body)
      res.status(201).json(task)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async deleteTask(req: AuthRequest, res: Response) {
    try {
      const { reason } = req.body
      const result = await taskService.deleteTask(req.userId!, Number(req.params.id), reason)
      res.json(result)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async logCompletion(req: AuthRequest, res: Response) {
    try {
      const result = await taskService.logCompletion(Number(req.params.id), req.body.achieved)
      res.json(result)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async getTodayCompletions(req: AuthRequest, res: Response) {
    const completions = await taskService.getTodayCompletions(req.userId!)
    res.json(completions)
  },
}
