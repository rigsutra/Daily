import { Response } from 'express'
import { timerService } from '../services/timer.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const timerController = {
  async start(req: AuthRequest, res: Response) {
    try {
      const session = await timerService.start(req.userId!, req.body.type ?? 'work')
      res.status(201).json(session)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async pause(req: AuthRequest, res: Response) {
    try {
      const session = await timerService.pause(req.userId!)
      res.json(session)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async stop(req: AuthRequest, res: Response) {
    try {
      const session = await timerService.stop(req.userId!)
      res.json(session)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async getActive(req: AuthRequest, res: Response) {
    const session = await timerService.getActive(req.userId!)
    res.json(session)
  },

  async getTodaySessions(req: AuthRequest, res: Response) {
    const sessions = await timerService.getTodaySessions(req.userId!)
    res.json(sessions)
  },
}
