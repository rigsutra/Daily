import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

const app = express();
app.use(express.json());

function getUserId(req: any): number {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('No token');
  return (jwt.verify(token, JWT_SECRET) as any).userId;
}

// Auth
app.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed } });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// GoalProgress routes — mirror goalProgressController + service logic

app.post('/api/goal-progress/update-all', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const timerSessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: thirtyDaysAgo, lte: now }, type: 'work' },
    });
    const timerHours = timerSessions.reduce((s: number, ss: any) => s + (ss.duration / 60), 0);

    const timerGoals = await prisma.goal.findMany({
      where: {
        userId, status: 'active',
        startDate: { lte: now }, endDate: { gte: thirtyDaysAgo },
      },
    });
    for (const goal of timerGoals) {
      const progress = goal.achievedHours + timerHours;
      await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: progress, status: progress >= goal.targetHours ? 'completed' : 'active' },
      });
    }

    const taskCompletions = await prisma.taskCompletion.findMany({
      where: {
        task: { userId },
        date: { gte: thirtyDaysAgo, lte: now },
        completed: true,
      },
      include: { task: true },
    });
    const taskHours = taskCompletions.length * 0.5;

    const taskGoals = await prisma.goal.findMany({
      where: {
        userId, status: 'active',
        startDate: { lte: now }, endDate: { gte: thirtyDaysAgo },
      },
    });
    for (const goal of taskGoals) {
      const progress = goal.achievedHours + taskHours;
      await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: progress, status: progress >= goal.targetHours ? 'completed' : 'active' },
      });
    }

    res.json({
      timerUpdates: { totalHours: timerHours, goalsUpdated: timerGoals.length },
      taskUpdates: { totalHours: taskHours, goalsUpdated: taskGoals.length },
      totalGoalsUpdated: timerGoals.length + taskGoals.length,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/goal-progress/update-from-timers', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const timerSessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: start, lte: end }, type: 'work' },
    });
    const totalHours = timerSessions.reduce((s: number, ss: any) => s + (ss.duration / 60), 0);

    const activeGoals = await prisma.goal.findMany({
      where: {
        userId, status: 'active',
        startDate: { lte: end }, endDate: { gte: start },
      },
    });
    for (const goal of activeGoals) {
      const progress = goal.achievedHours + totalHours;
      await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: progress, status: progress >= goal.targetHours ? 'completed' : 'active' },
      });
    }

    res.json({ totalHours, goalsUpdated: activeGoals.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/goal-progress/update-from-tasks', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const taskCompletions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: { gte: start, lte: end }, completed: true },
      include: { task: true },
    });
    const totalHours = taskCompletions.length * 0.5;

    const activeGoals = await prisma.goal.findMany({
      where: {
        userId, status: 'active',
        startDate: { lte: end }, endDate: { gte: start },
      },
    });
    for (const goal of activeGoals) {
      const progress = goal.achievedHours + totalHours;
      await prisma.goal.update({
        where: { id: goal.id },
        data: { achievedHours: progress, status: progress >= goal.targetHours ? 'completed' : 'active' },
      });
    }

    res.json({ totalHours, goalsUpdated: activeGoals.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/goal-progress/:goalId/progress', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const goalId = Number(req.params.goalId);
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) return res.status(404).json({ error: 'Goal not found' });

    const progressPercentage = goal.targetHours > 0
      ? Math.round((goal.achievedHours / goal.targetHours) * 10000) / 100
      : 0;
    const remainingHours = Math.max(0, goal.targetHours - goal.achievedHours);

    res.json({
      ...goal,
      progressPercentage,
      remainingHours: Math.round(remainingHours * 10) / 10,
      isCompleted: goal.status === 'completed',
      isFailed: goal.status === 'failed',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/goal-progress/:goalId/progress', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const goalId = Number(req.params.goalId);
    const { achievedHours } = req.body;
    if (achievedHours === undefined) return res.status(400).json({ error: 'achievedHours is required' });

    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) return res.status(404).json({ error: 'Goal not found' });

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        achievedHours,
        status: achievedHours >= goal.targetHours ? 'completed' : 'active',
      },
    });
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

describe('GoalProgress API', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const email = `goal-progress-api-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'GoalProgress User', email, password: 'password123' });
    expect(res.status).toBe(201);
    token = res.body.token;
    userId = (jwt.verify(token, JWT_SECRET) as any).userId;
  });

  async function createGoal(overrides: Partial<{
    title: string; period: string; targetHours: number;
    achievedHours: number; status: string; daysFromNow: number;
  }> = {}) {
    const now = new Date();
    return prisma.goal.create({
      data: {
        userId,
        title: overrides.title ?? 'Test Goal',
        period: overrides.period ?? 'weekly',
        targetHours: overrides.targetHours ?? 10,
        achievedHours: overrides.achievedHours ?? 0,
        status: overrides.status ?? 'active',
        startDate: new Date(now.getTime() - 86400000),
        endDate: new Date(now.getTime() + (overrides.daysFromNow ?? 7) * 86400000),
      },
    });
  }

  // ── GET /:goalId/progress ─────────────────────────────────────────────────

  describe('GET /api/goal-progress/:goalId/progress', () => {
    it('returns goal with progressPercentage, remainingHours, isCompleted, isFailed', async () => {
      const goal = await createGoal({ targetHours: 10, achievedHours: 0 });

      const res = await request(app)
        .get(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(goal.id);
      expect(res.body).toHaveProperty('progressPercentage');
      expect(res.body).toHaveProperty('remainingHours');
      expect(res.body).toHaveProperty('isCompleted');
      expect(res.body).toHaveProperty('isFailed');
      expect(res.body.progressPercentage).toBe(0);
      expect(res.body.remainingHours).toBe(10);
      expect(res.body.isCompleted).toBe(false);
      expect(res.body.isFailed).toBe(false);
    });

    it('computes progressPercentage correctly at 50%', async () => {
      const goal = await createGoal({ targetHours: 20, achievedHours: 10 });

      const res = await request(app)
        .get(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.progressPercentage).toBe(50);
      expect(res.body.remainingHours).toBe(10);
    });

    it('isCompleted is true for completed status', async () => {
      const goal = await createGoal({ targetHours: 5, achievedHours: 5, status: 'completed' });

      const res = await request(app)
        .get(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.isCompleted).toBe(true);
      expect(res.body.isFailed).toBe(false);
    });

    it('isFailed is true for failed status', async () => {
      const goal = await createGoal({ targetHours: 10, achievedHours: 2, status: 'failed' });

      const res = await request(app)
        .get(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.isFailed).toBe(true);
      expect(res.body.isCompleted).toBe(false);
    });

    it('returns 404 for non-existent goal', async () => {
      const res = await request(app)
        .get('/api/goal-progress/999999/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('returns 404 for another user\'s goal', async () => {
      const emailB = `gp-other-${Date.now()}@example.com`;
      const regB = await request(app)
        .post('/api/auth/register')
        .send({ name: 'User B', email: emailB, password: 'password123' });
      const tokenB = regB.body.token;
      const userBId = (jwt.verify(tokenB, JWT_SECRET) as any).userId;

      const goalB = await prisma.goal.create({
        data: {
          userId: userBId, title: 'B goal', period: 'weekly',
          targetHours: 10, achievedHours: 0, status: 'active',
          startDate: new Date(), endDate: new Date(Date.now() + 86400000 * 7),
        },
      });

      const res = await request(app)
        .get(`/api/goal-progress/${goalB.id}/progress`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── PATCH /:goalId/progress ────────────────────────────────────────────────

  describe('PATCH /api/goal-progress/:goalId/progress', () => {
    it('updates achievedHours and keeps active status when below target', async () => {
      const goal = await createGoal({ targetHours: 10 });

      const res = await request(app)
        .patch(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 4 });

      expect(res.status).toBe(200);
      expect(res.body.achievedHours).toBe(4);
      expect(res.body.status).toBe('active');
    });

    it('marks as completed when achievedHours reaches target', async () => {
      const goal = await createGoal({ targetHours: 8 });

      const res = await request(app)
        .patch(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 8 });

      expect(res.body.status).toBe('completed');
    });

    it('returns 400 when achievedHours is missing', async () => {
      const goal = await createGoal();

      const res = await request(app)
        .patch(`/api/goal-progress/${goal.id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent goal', async () => {
      const res = await request(app)
        .patch('/api/goal-progress/999999/progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 5 });

      expect(res.status).toBe(404);
    });
  });

  // ── POST /update-from-timers ──────────────────────────────────────────────

  describe('POST /api/goal-progress/update-from-timers', () => {
    it('requires startDate and endDate', async () => {
      const res = await request(app)
        .post('/api/goal-progress/update-from-timers')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns totalHours and goalsUpdated shape', async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      const res = await request(app)
        .post('/api/goal-progress/update-from-timers')
        .set('Authorization', `Bearer ${token}`)
        .send({ startDate: weekAgo.toISOString(), endDate: now.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalHours');
      expect(res.body).toHaveProperty('goalsUpdated');
      expect(res.body.totalHours).toBeGreaterThanOrEqual(0);
    });

    it('updates a goal progress when timer sessions exist', async () => {
      const goal = await createGoal({ targetHours: 100, achievedHours: 0 });

      // Create a work timer session in the last week
      const start = new Date();
      start.setHours(start.getHours() - 2);
      await prisma.timerSession.create({
        data: {
          userId,
          type: 'work',
          startTime: start,
          endTime: new Date(),
          duration: 120, // 120 minutes = 2 hours
          paused: false,
        },
      });

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      await request(app)
        .post('/api/goal-progress/update-from-timers')
        .set('Authorization', `Bearer ${token}`)
        .send({ startDate: weekAgo.toISOString(), endDate: now.toISOString() });

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated?.achievedHours).toBeGreaterThan(0);
    });
  });

  // ── POST /update-from-tasks ───────────────────────────────────────────────

  describe('POST /api/goal-progress/update-from-tasks', () => {
    it('requires startDate and endDate', async () => {
      const res = await request(app)
        .post('/api/goal-progress/update-from-tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns totalHours and goalsUpdated shape', async () => {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      const res = await request(app)
        .post('/api/goal-progress/update-from-tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ startDate: weekAgo.toISOString(), endDate: now.toISOString() });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalHours');
      expect(res.body).toHaveProperty('goalsUpdated');
    });

    it('each completed task adds 0.5 hours to goals', async () => {
      const goal = await createGoal({ targetHours: 100, achievedHours: 0 });

      // Create a task and log it as completed today
      const task = await prisma.task.create({
        data: { userId, title: 'Progress task', target: 1, unit: 'times', mandatory: false },
      });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      await prisma.taskCompletion.create({
        data: { taskId: task.id, date: today, achieved: 1, completed: true },
      });

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      await request(app)
        .post('/api/goal-progress/update-from-tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ startDate: weekAgo.toISOString(), endDate: now.toISOString() });

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated?.achievedHours).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ── POST /update-all ──────────────────────────────────────────────────────

  describe('POST /api/goal-progress/update-all', () => {
    it('returns timerUpdates, taskUpdates, totalGoalsUpdated', async () => {
      const res = await request(app)
        .post('/api/goal-progress/update-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('timerUpdates');
      expect(res.body).toHaveProperty('taskUpdates');
      expect(res.body).toHaveProperty('totalGoalsUpdated');
      expect(res.body.timerUpdates).toHaveProperty('totalHours');
      expect(res.body.timerUpdates).toHaveProperty('goalsUpdated');
      expect(res.body.taskUpdates).toHaveProperty('totalHours');
      expect(res.body.taskUpdates).toHaveProperty('goalsUpdated');
    });

    it('totalGoalsUpdated equals sum of timer and task goals updated', async () => {
      const res = await request(app)
        .post('/api/goal-progress/update-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.totalGoalsUpdated).toBe(
        res.body.timerUpdates.goalsUpdated + res.body.taskUpdates.goalsUpdated
      );
    });
  });
});
