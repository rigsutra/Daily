import { taskRepository } from '../repositories/task.repository.js'

export const taskService = {
  getTasks: (userId: number) => taskRepository.findAllByUser(userId),

  createTask: (userId: number, body: { title: string; target: number; unit: string; mandatory?: boolean }) =>
    taskRepository.create({
      userId,
      title: body.title,
      target: body.target,
      unit: body.unit,
      mandatory: body.mandatory ?? false,
    }),

  async deleteTask(userId: number, taskId: number, reason: string) {
    if (!reason || reason.length < 1000) {
      throw new Error('Reason must be at least 1000 characters')
    }
    const task = await taskRepository.findById(taskId)
    if (!task) throw new Error('Task not found')
    await taskRepository.createDeleteRequest({ userId, taskId, reason })
    await taskRepository.delete(taskId)
    return { message: 'Task deleted' }
  },

  async logCompletion(taskId: number, achieved: number) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return taskRepository.upsertCompletion(taskId, today, achieved)
  },

  getTodayCompletions: (userId: number) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return taskRepository.getCompletionsForDate(userId, today)
  },
}
