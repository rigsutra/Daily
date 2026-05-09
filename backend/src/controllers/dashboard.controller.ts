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

  async updateDaily(req: AuthRequest, res: Response) {
    try {
      const { workHours, studyHours, gymCompleted, waterLiters, sleepHours } = req.body
      const entry = await dashboardService.updateDaily(req.userId!, {
        workHours: workHours !== undefined ? Number(workHours) : undefined,
        studyHours: studyHours !== undefined ? Number(studyHours) : undefined,
        gymCompleted: gymCompleted !== undefined ? Boolean(gymCompleted) : undefined,
        waterLiters: waterLiters !== undefined ? Number(waterLiters) : undefined,
        sleepHours: sleepHours !== undefined ? Number(sleepHours) : undefined,
      })
      res.json(entry)
    } catch (e: any) {
      res.status(500).json({ error: e.message })
    }
  },
}
