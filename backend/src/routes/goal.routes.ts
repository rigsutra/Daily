import { Router } from 'express'
import { goalController } from '../controllers/goal.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', goalController.getGoals)
router.post('/', goalController.createGoal)
router.patch('/:id/progress', goalController.updateProgress)
router.get('/:id/details', goalController.getGoalDetails)
router.get('/progress', goalController.getGoalProgress)
router.post('/auto-update', goalController.autoUpdateGoals)

export default router
