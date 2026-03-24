import { Response } from 'express'
import { dashboardService } from '../services/dashboard.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const dashboardController = {
  async daily(req: AuthRequest, res: Response) {
    try {
      const data = await dashboardService.getDaily(req.userId!)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async weekly(req: AuthRequest, res: Response) {
    try {
      const data = await dashboardService.getWeekly(req.userId!)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async monthly(req: AuthRequest, res: Response) {
    try {
      const data = await dashboardService.getMonthly(req.userId!)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },

  async yearly(req: AuthRequest, res: Response) {
    try {
      const data = await dashboardService.getYearly(req.userId!)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },
}
