import { Request, Response } from 'express'
import { mobileUsageService } from '../services/mobileUsage.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const mobileUsageController = {
  async sync(req: Request, res: Response) {
    try {
      const { userId, data } = req.body
      if (!userId || !Array.isArray(data)) {
        res.status(400).json({ error: 'userId and data array required' })
        return
      }
      const result = await mobileUsageService.syncUsage(userId, data)
      res.json({ synced: result.length })
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async getToday(req: AuthRequest, res: Response) {
    try {
      const data = await mobileUsageService.getTodayUsage(req.userId!)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },
}
