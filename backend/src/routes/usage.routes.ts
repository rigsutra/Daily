import { Router } from 'express'
import { mobileUsageController } from '../controllers/mobileUsage.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/today', mobileUsageController.syncFromDevice)
router.post('/link-device', authenticate, mobileUsageController.linkDevice)

export default router
