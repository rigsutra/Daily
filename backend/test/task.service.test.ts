import { prisma, bcrypt } from './setup';

describe('Task Service Tests', () => {
  let testUserId: number;
  let otherUserId: number;

  beforeAll(async () => {
    // Create test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        name: 'Task Test User',
        email: `task-test-${Date.now()}@example.com`,
        password: hashedPassword
      }
    });
    testUserId = user.id;

    const otherUser = await prisma.user.create({
      data: {
        name: 'Other User',
        email: `other-${Date.now()}@example.com`,
        password: hashedPassword
      }
    });
    otherUserId = otherUser.id;
  });

  describe('Create Task', () => {
    it('should create a task successfully', async () => {
      const task = await prisma.task.create({
        data: {
          userId: testUserId,
          title: 'Test Task',
          target: 10,
          unit: 'hours',
          mandatory: true
        }
      });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Test Task');
      expect(task.target).toBe(10);
      expect(task.unit).toBe('hours');
      expect(task.mandatory).toBe(true);
      expect(task.userId).toBe(testUserId);
    });

    it('should create task with default values', async () => {
      const task = await prisma.task.create({
        data: {
          userId: testUserId,
          title: 'Default Task',
          target: 5,
          unit: 'pages'
        }
      });

      expect(task.mandatory).toBe(false); // default value
    });
  });

  describe('Get Tasks', () => {
    it('should get all tasks for a user', async () => {
      // Create a task first
      await prisma.task.create({
        data: {
          userId: testUserId,
          title: 'Get Task Test',
          target: 10,
          unit: 'hours'
        }
      });

      const tasks = await prisma.task.findMany({
        where: { userId: testUserId }
      });

      expect(Array.isArray(tasks)).toBe(true);
      expect(tasks.length).toBeGreaterThan(0);
      tasks.forEach(task => {
        expect(task.userId).toBe(testUserId);
      });
    });

    it('should not return tasks from other users', async () => {
      // Create task for other user
      await prisma.task.create({
        data: {
          userId: otherUserId,
          title: 'Other Task',
          target: 5,
          unit: 'hours'
        }
      });

      // Get tasks for test user
      const tasks = await prisma.task.findMany({
        where: { userId: testUserId }
      });

      tasks.forEach(task => {
        expect(task.userId).toBe(testUserId);
      });
    });
  });

  describe('Task Completion', () => {
    let taskId: number;

    beforeEach(async () => {
      // Create a fresh task for each test
      const task = await prisma.task.create({
        data: {
          userId: testUserId,
          title: 'Completion Test Task',
          target: 10,
          unit: 'hours'
        }
      });
      taskId = task.id;
    });

    it('should log task completion', async () => {
      const completion = await prisma.taskCompletion.create({
        data: {
          taskId: taskId,
          date: new Date(),
          achieved: 8,
          completed: true
        }
      });

      expect(completion.id).toBeDefined();
      expect(completion.taskId).toBe(taskId);
      expect(completion.achieved).toBe(8);
      expect(completion.completed).toBe(true);
    });

    it('should enforce unique task completion per day', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create a completion for today
      await prisma.taskCompletion.create({
        data: {
          taskId: taskId,
          date: today,
          achieved: 5,
          completed: false
        }
      });

      // Try to create another completion for same task on same day - should fail
      await expect(
        prisma.taskCompletion.create({
          data: {
            taskId: taskId,
            date: today,
            achieved: 3,
            completed: false
          }
        })
      ).rejects.toThrow();
    });

    it('should get today completions', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create a completion for today
      await prisma.taskCompletion.create({
        data: {
          taskId: taskId,
          date: today,
          achieved: 5,
          completed: true
        }
      });

      const completions = await prisma.taskCompletion.findMany({
        where: {
          task: { userId: testUserId },
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        include: { task: true }
      });

      expect(Array.isArray(completions)).toBe(true);
      expect(completions.length).toBeGreaterThan(0);
    });
  });

  describe('Delete Task', () => {
    it('should delete task', async () => {
      const task = await prisma.task.create({
        data: {
          userId: testUserId,
          title: 'Task to Delete',
          target: 5,
          unit: 'hours'
        }
      });

      const taskId = task.id;

      // Delete the task
      await prisma.task.delete({
        where: { id: taskId }
      });

      // Verify task is deleted
      const deletedTask = await prisma.task.findUnique({
        where: { id: taskId }
      });
      expect(deletedTask).toBeNull();
    });
  });
});
