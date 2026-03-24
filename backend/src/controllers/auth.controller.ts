import { Request, Response } from 'express'
import { authService } from '../services/auth.service.js'
import { AuthRequest } from '../middleware/auth.js'

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body
      if (!name || !email || !password) {
        res.status(400).json({ error: 'name, email and password are required' })
        return
      }
      const result = await authService.register(name, email, password)
      res.status(201).json(result)
    } catch (e: any) {
      res.status(400).json({ error: e.message })
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const result = await authService.login(email, password)
      res.json(result)
    } catch (e: any) {
      res.status(401).json({ error: e.message })
    }
  },

  async profile(req: AuthRequest, res: Response) {
    try {
      const user = await authService.getProfile(req.userId!)
      res.json(user)
    } catch (e: any) {
      res.status(404).json({ error: e.message })
    }
  },
}
