import { Router } from 'express'
import { goalProgressController } from '../controllers/goalProgress.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.post('/update-all', goalProgressController.updateAllGoals)
router.post('/update-from-timers', goalProgressController.updateFromTimers)
router.post('/update-from-tasks', goalProgressController.updateFromTasks)
router.get('/:goalId/progress', goalProgressController.getGoalProgress)
router.patch('/:goalId/progress', goalProgressController.updateGoalProgress)

export default router