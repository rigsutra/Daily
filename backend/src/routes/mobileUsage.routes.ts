import { Router } from 'express'
import { mobileUsageController } from '../controllers/mobileUsage.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/sync', mobileUsageController.sync)
router.get('/today', mobileUsageController.getToday)

export default router
