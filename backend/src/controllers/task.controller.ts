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

  async getRemovedForDate(req: AuthRequest, res: Response) {
    try {
      const { date } = req.query
      if (!date) {
        res.status(400).json({ error: 'Date parameter is required' })
        return
      }
      const parts = (date as string).split('-').map(Number)
      if (parts.length !== 3 || parts.some(isNaN)) {
        res.status(400).json({ error: 'Invalid date format' })
        return
      }
      const parsedDate = new Date(parts[0], parts[1] - 1, parts[2])
      const removed = await taskService.getRemovedForDate(req.userId!, parsedDate)
      res.json(removed)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async getCompletionsForDate(req: AuthRequest, res: Response) {
    try {
      const { date } = req.query
      if (!date) {
        res.status(400).json({ error: 'Date parameter is required' })
        return
      }
      
      // Parse as local date (not UTC) to match how completions are stored
      const parts = (date as string).split('-').map(Number)
      if (parts.length !== 3 || parts.some(isNaN)) {
        res.status(400).json({ error: 'Invalid date format' })
        return
      }
      const parsedDate = new Date(parts[0], parts[1] - 1, parts[2])
      
      const completions = await taskService.getCompletionsForDate(req.userId!, parsedDate)
      res.json(completions)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },
}
