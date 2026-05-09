import { prisma, bcrypt } from './setup';

describe('Goal Service Tests', () => {
  describe('Create Goal', () => {
    it('should create a goal successfully', async () => {
      // Create user for this test
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Test User',
          email: `goal-test-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const startDate = new Date();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Weekly Goal',
          period: 'weekly',
          targetHours: 40,
          achievedHours: 0,
          status: 'active',
          startDate,
          endDate
        }
      });

      expect(goal.id).toBeDefined();
      expect(goal.title).toBe('Weekly Goal');
      expect(goal.period).toBe('weekly');
      expect(goal.targetHours).toBe(40);
      expect(goal.status).toBe('active');
      expect(goal.userId).toBe(user.id);
    });

    it('should create goal with different periods', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Period User',
          email: `goal-period-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const periods = ['daily', 'weekly', 'monthly', 'yearly'];
      
      for (const period of periods) {
        const goal = await prisma.goal.create({
          data: {
            userId: user.id,
            title: `${period} Goal`,
            period,
            targetHours: 10,
            achievedHours: 0,
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        });
        expect(goal.period).toBe(period);
      }
    });

    it('should set default status to active', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Default User',
          email: `goal-default-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Default Status Goal',
          period: 'daily',
          targetHours: 8,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      expect(goal.status).toBe('active');
      expect(goal.achievedHours).toBe(0);
    });
  });

  describe('Get Goals', () => {
    it('should get all goals for user', async () => {
      // Create user and goal
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Get User',
          email: `goal-get-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Get Goal Test',
          period: 'daily',
          targetHours: 10,
          achievedHours: 0,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      const goals = await prisma.goal.findMany({
        where: { userId: user.id }
      });

      expect(Array.isArray(goals)).toBe(true);
      expect(goals.length).toBeGreaterThan(0);
      goals.forEach(goal => {
        expect(goal.userId).toBe(user.id);
      });
    });

    it('should filter goals by status', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Filter User',
          email: `goal-filter-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Active Goal',
          period: 'daily',
          targetHours: 8,
          achievedHours: 5,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      const activeGoals = await prisma.goal.findMany({
        where: {
          userId: user.id,
          status: 'active'
        }
      });

      activeGoals.forEach(goal => {
        expect(goal.status).toBe('active');
      });
    });
  });

  describe('Update Goal Progress', () => {
    it('should update achieved hours', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Progress User',
          email: `goal-progress-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Progress Test Goal',
          period: 'daily',
          targetHours: 10,
          achievedHours: 0,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      const updated = await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: 5 }
      });

      expect(updated.achievedHours).toBe(5);
    });

    it('should mark goal as completed when target reached', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Complete User',
          email: `goal-complete-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Complete Test Goal',
          period: 'daily',
          targetHours: 10,
          achievedHours: 0,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      const updated = await prisma.goal.update({
        where: { id: goal.id },
        data: {
          achievedHours: 10, // Reached target
          status: 'completed'
        }
      });

      expect(updated.achievedHours).toBe(10);
      expect(updated.status).toBe('completed');
    });
  });

  describe('Update Goal', () => {
    it('should update goal title', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Update User',
          email: `goal-update-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Update Test Goal',
          period: 'monthly',
          targetHours: 100,
          achievedHours: 20,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      const updated = await prisma.goal.update({
        where: { id: goal.id },
        data: { title: 'Updated Goal Title' }
      });

      expect(updated.title).toBe('Updated Goal Title');
    });

    it('should update target hours', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Target User',
          email: `goal-target-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Target Test Goal',
          period: 'monthly',
          targetHours: 100,
          achievedHours: 20,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      const updated = await prisma.goal.update({
        where: { id: goal.id },
        data: { targetHours: 150 }
      });

      expect(updated.targetHours).toBe(150);
    });
  });

  describe('Delete Goal', () => {
    it('should delete goal', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Goal Delete User',
          email: `goal-delete-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const goal = await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Goal to Delete',
          period: 'daily',
          targetHours: 5,
          startDate: new Date(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      });

      await prisma.goal.delete({
        where: { id: goal.id }
      });

      const deleted = await prisma.goal.findUnique({
        where: { id: goal.id }
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Cron Job Logic - Check Expired Goals', () => {
    it('should identify expired goals', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Cron Test User',
          email: `cron-test-${Date.now()}@example.com`,
          password: hashedPassword
        }
      });

      const now = new Date();

      // Create an expired goal (endDate in the past)
      await prisma.goal.create({
        data: {
          userId: user.id,
          title: 'Expired Goal',
          period: 'daily',
          targetHours: 8,
          achievedHours: 5,
          status: 'active',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      });

      // Find expired goals
      const expiredGoals = await prisma.goal.findMany({
        where: {
          status: 'active',
          endDate: { lt: now }
        }
      });

      expect(expiredGoals.length).toBeGreaterThan(0);
      expiredGoals.forEach(goal => {
        expect(goal.status).toBe('active');
        expect(goal.endDate < now).toBe(true);
      });
    });
  });
});
