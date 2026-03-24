import { Router } from 'express'
import { dashboardController } from '../controllers/dashboard.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/daily', dashboardController.daily)
router.get('/weekly', dashboardController.weekly)
router.get('/monthly', dashboardController.monthly)
router.get('/yearly', dashboardController.yearly)

export default router
