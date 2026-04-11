import { Request, Response } from 'express'
import { mobileUsageService } from '../services/mobileUsage.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const mobileUsageController = {
  // POST /api/usage/today — open, called by mobile app
  async syncFromDevice(req: Request, res: Response) {
    try {
      const { deviceId, capturedAt, apps } = req.body
      if (!deviceId || !capturedAt || !Array.isArray(apps)) {
        res.status(400).json({ error: 'deviceId, capturedAt, and apps array required' })
        return
      }
      const result = await mobileUsageService.syncUsage(deviceId, capturedAt, apps)
      res.json({ synced: result.length })
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  // POST /api/usage/link-device — auth required, links deviceId to logged-in user
  async linkDevice(req: AuthRequest, res: Response) {
    try {
      const { deviceId } = req.body
      if (!deviceId) {
        res.status(400).json({ error: 'deviceId required' })
        return
      }
      await mobileUsageService.linkDevice(req.userId!, deviceId)
      res.json({ linked: true, deviceId })
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  // GET /api/mobile-usage/today — auth required, for dashboard
  async getToday(req: AuthRequest, res: Response) {
    try {
      const data = await mobileUsageService.getTodayUsage(req.userId!)
      res.json(data)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },
}
