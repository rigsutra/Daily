import { Router } from 'express'
import { timerController } from '../controllers/timer.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.post('/start', timerController.start)
router.post('/pause', timerController.pause)
router.post('/stop', timerController.stop)
router.get('/active', timerController.getActive)
router.get('/today', timerController.getTodaySessions)

export default router
