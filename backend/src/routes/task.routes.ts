import { Router } from 'express'
import { taskController } from '../controllers/task.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', taskController.getTasks)
router.post('/', taskController.createTask)
router.delete('/:id', taskController.deleteTask)
router.post('/:id/complete', taskController.logCompletion)
router.get('/completions/today', taskController.getTodayCompletions)
router.get('/completions/date', taskController.getCompletionsForDate)
router.get('/removed', taskController.getRemovedForDate)

export default router
