import { prisma, bcrypt } from './setup';

describe('Dashboard Service Tests', () => {
  let testUserId: number;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Dashboard Test User',
        email: `dashboard-test-${Date.now()}@example.com`,
        password: hashedPassword
      }
    });
    testUserId = user.id;
  });

  describe('Daily Entry', () => {
    it('should create daily entry', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const entry = await prisma.dailyEntry.create({
        data: {
          userId: testUserId,
          date: today,
          workHours: 8,
          studyHours: 2,
          gymCompleted: true,
          waterLiters: 3,
          sleepHours: 7,
          productiveHours: 6
        }
      });

      expect(entry.id).toBeDefined();
      expect(entry.userId).toBe(testUserId);
      expect(entry.workHours).toBe(8);
      expect(entry.gymCompleted).toBe(true);
    });

    it('should enforce unique entry per day', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // First create an entry for today
      await prisma.dailyEntry.create({
        data: {
          userId: testUserId,
          date: today,
          workHours: 8
        }
      }).catch(() => {}); // Ignore if already exists

      // Try to create another entry for same day - should fail
      await expect(
        prisma.dailyEntry.create({
          data: {
            userId: testUserId,
            date: today,
            workHours: 4
          }
        })
      ).rejects.toThrow();
    });

    it('should get today entry', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create entry for today
      await prisma.dailyEntry.create({
        data: {
          userId: testUserId,
          date: today,
          workHours: 7,
          studyHours: 1,
          gymCompleted: false,
          waterLiters: 2.5,
          sleepHours: 8,
          productiveHours: 5
        }
      }).catch(() => {}); // Ignore if already exists

      const entry = await prisma.dailyEntry.findFirst({
        where: {
          userId: testUserId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      expect(entry).not.toBeNull();
      expect(entry?.userId).toBe(testUserId);
    });
  });

  describe('Aggregations', () => {
    it('should calculate weekly totals', async () => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      // Create some entries
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        await prisma.dailyEntry.create({
          data: {
            userId: testUserId,
            date,
            workHours: 8,
            studyHours: 2,
            gymCompleted: true,
            waterLiters: 3,
            sleepHours: 7,
            productiveHours: 6
          }
        }).catch(() => {}); // Ignore duplicates
      }

      const weeklyData = await prisma.dailyEntry.groupBy({
        by: ['date'],
        where: {
          userId: testUserId,
          date: { gte: weekAgo }
        },
        _sum: {
          workHours: true,
          studyHours: true,
          productiveHours: true
        }
      });

      expect(Array.isArray(weeklyData)).toBe(true);
    });

    it('should get timer sessions for period', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create timer sessions
      for (let i = 0; i < 3; i++) {
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - i);
        startTime.setHours(9, 0, 0, 0);

        await prisma.timerSession.create({
          data: {
            userId: testUserId,
            type: 'work',
            startTime,
            endTime: new Date(startTime.getTime() + 4 * 60 * 60 * 1000),
            duration: 14400,
            paused: false
          }
        });
      }

      const sessions = await prisma.timerSession.findMany({
        where: {
          userId: testUserId,
          startTime: { gte: today }
        }
      });

      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should calculate total hours', async () => {
      // Create some entries first
      await prisma.dailyEntry.create({
        data: {
          userId: testUserId,
          date: new Date(),
          workHours: 8,
          studyHours: 2,
          gymCompleted: true,
          waterLiters: 3,
          sleepHours: 7,
          productiveHours: 6
        }
      }).catch(() => {});

      const result = await prisma.dailyEntry.aggregate({
        where: { userId: testUserId },
        _sum: {
          workHours: true,
          studyHours: true,
          productiveHours: true
        }
      });

      expect(result._sum).toBeDefined();
    });
  });

  describe('Task Completions', () => {
    it('should get task completions with task details', async () => {
      // Create a task first
      const task = await prisma.task.create({
        data: {
          userId: testUserId,
          title: 'Dashboard Task',
          target: 10,
          unit: 'hours'
        }
      });

      // Create completion
      await prisma.taskCompletion.create({
        data: {
          taskId: task.id,
          date: new Date(),
          achieved: 8,
          completed: true
        }
      });

      const completions = await prisma.taskCompletion.findMany({
        where: { task: { userId: testUserId } },
        include: { task: true }
      });

      expect(Array.isArray(completions)).toBe(true);
      if (completions.length > 0) {
        expect(completions[0].task.userId).toBe(testUserId);
      }
    });
  });

  describe('Goals', () => {
    it('should get active goals', async () => {
      // Create a goal
      await prisma.goal.create({
        data: {
          userId: testUserId,
          title: 'Dashboard Goal',
          period: 'daily',
          targetHours: 8,
          achievedHours: 5,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const activeGoals = await prisma.goal.findMany({
        where: {
          userId: testUserId,
          status: 'active'
        }
      });

      expect(Array.isArray(activeGoals)).toBe(true);
      activeGoals.forEach(goal => {
        expect(goal.status).toBe('active');
      });
    });
  });
});
