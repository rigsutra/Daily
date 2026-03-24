import { Router } from 'express'
import { authController } from '../controllers/auth.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/profile', authenticate, authController.profile)

export default router
