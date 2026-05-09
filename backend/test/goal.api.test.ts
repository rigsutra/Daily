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

function getPeriodDates(period: string) {
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { startDate: start, endDate: end };
}

// Goal routes
app.get('/api/goals', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const goals = await prisma.goal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    res.json(goals);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/goals', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const { title, period, targetHours } = req.body;
    if (!title || !period || targetHours === undefined) {
      return res.status(400).json({ error: 'title, period, and targetHours are required' });
    }
    const { startDate, endDate } = getPeriodDates(period);
    const goal = await prisma.goal.create({
      data: { userId, title, period, targetHours, achievedHours: 0, status: 'active', startDate, endDate },
    });
    res.status(201).json(goal);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.patch('/api/goals/:id/progress', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const goalId = Number(req.params.id);
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
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/goals/:id/details', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const goalId = Number(req.params.id);
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== userId) return res.status(404).json({ error: 'Goal not found' });
    const progressPercentage = goal.targetHours > 0
      ? Math.round((goal.achievedHours / goal.targetHours) * 100)
      : 0;
    res.json({ ...goal, progressPercentage });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/goals/progress', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(goals);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/goals/auto-update', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const now = new Date();
    const expiredGoals = await prisma.goal.findMany({
      where: { userId, status: 'active', endDate: { lt: now } },
    });
    let completedCount = 0;
    let failedCount = 0;
    for (const goal of expiredGoals) {
      const status = goal.achievedHours >= goal.targetHours ? 'completed' : 'failed';
      await prisma.goal.update({ where: { id: goal.id }, data: { status } });
      if (status === 'completed') completedCount++;
      else failedCount++;
    }
    res.json({ processed: expiredGoals.length, completedCount, failedCount });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Goal API', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const email = `goal-api-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Goal API User', email, password: 'password123' });
    expect(res.status).toBe(201);
    token = res.body.token;
    userId = (jwt.verify(token, JWT_SECRET) as any).userId;
  });

  // ── Create ────────────────────────────────────────────────────────────────

  describe('POST /api/goals', () => {
    it('rejects without token', async () => {
      const res = await request(app)
        .post('/api/goals')
        .send({ title: 'Test', period: 'weekly', targetHours: 10 });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects missing required fields', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Missing period' });
      expect(res.status).toBe(400);
    });

    it('creates weekly goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Weekly coding', period: 'weekly', targetHours: 20 });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Weekly coding');
      expect(res.body.period).toBe('weekly');
      expect(res.body.targetHours).toBe(20);
      expect(res.body.achievedHours).toBe(0);
      expect(res.body.status).toBe('active');
      expect(res.body.userId).toBe(userId);
    });

    it('creates monthly goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Monthly reading', period: 'monthly', targetHours: 50 });

      expect(res.status).toBe(201);
      expect(res.body.period).toBe('monthly');
    });

    it('creates yearly goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Yearly project', period: 'yearly', targetHours: 500 });

      expect(res.status).toBe(201);
      expect(res.body.period).toBe('yearly');
    });

    it('auto-sets startDate and endDate', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Date check', period: 'weekly', targetHours: 10 });

      expect(res.body.startDate).toBeDefined();
      expect(res.body.endDate).toBeDefined();
      expect(new Date(res.body.endDate).getTime()).toBeGreaterThan(new Date(res.body.startDate).getTime());
    });
  });

  // ── Get all ───────────────────────────────────────────────────────────────

  describe('GET /api/goals', () => {
    it('returns array of goals', async () => {
      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((g: any) => expect(g.userId).toBe(userId));
    });

    it('newly created goal appears in list', async () => {
      const title = `List goal ${Date.now()}`;
      await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title, period: 'weekly', targetHours: 5 });

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${token}`);

      const found = res.body.find((g: any) => g.title === title);
      expect(found).toBeDefined();
    });
  });

  // ── Progress update ───────────────────────────────────────────────────────

  describe('PATCH /api/goals/:id/progress', () => {
    let goalId: number;

    beforeEach(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Progress test goal', period: 'weekly', targetHours: 10 });
      goalId = createRes.body.id;
    });

    it('updates achievedHours', async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalId}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 5 });

      expect(res.status).toBe(200);
      expect(res.body.achievedHours).toBe(5);
      expect(res.body.status).toBe('active');
    });

    it('marks goal as completed when target is reached', async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalId}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 10 });

      expect(res.status).toBe(200);
      expect(res.body.achievedHours).toBe(10);
      expect(res.body.status).toBe('completed');
    });

    it('marks goal as completed when hours exceed target', async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalId}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 15 });

      expect(res.body.status).toBe('completed');
    });

    it('returns 400 when achievedHours is missing', async () => {
      const res = await request(app)
        .patch(`/api/goals/${goalId}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('returns 404 for goal that does not exist', async () => {
      const res = await request(app)
        .patch('/api/goals/999999/progress')
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 5 });

      expect(res.status).toBe(404);
    });

    it('returns 404 when accessing another user\'s goal', async () => {
      // Create a second user and their goal
      const emailB = `goal-other-${Date.now()}@example.com`;
      const regB = await request(app)
        .post('/api/auth/register')
        .send({ name: 'User B', email: emailB, password: 'password123' });
      const tokenB = regB.body.token;

      const goalB = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ title: 'User B goal', period: 'weekly', targetHours: 5 });

      const res = await request(app)
        .patch(`/api/goals/${goalB.body.id}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 3 });

      expect(res.status).toBe(404);
    });
  });

  // ── Goal details ──────────────────────────────────────────────────────────

  describe('GET /api/goals/:id/details', () => {
    let goalId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Details goal', period: 'monthly', targetHours: 40 });
      goalId = createRes.body.id;
    });

    it('returns full goal with progressPercentage', async () => {
      const res = await request(app)
        .get(`/api/goals/${goalId}/details`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(goalId);
      expect(res.body.title).toBe('Details goal');
      expect(res.body).toHaveProperty('progressPercentage');
      expect(res.body.progressPercentage).toBe(0);
    });

    it('progressPercentage is correct after update', async () => {
      await request(app)
        .patch(`/api/goals/${goalId}/progress`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achievedHours: 20 });

      const res = await request(app)
        .get(`/api/goals/${goalId}/details`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.progressPercentage).toBe(50); // 20/40 * 100
    });

    it('returns 404 for non-existent goal', async () => {
      const res = await request(app)
        .get('/api/goals/999999/details')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── Goal progress list ────────────────────────────────────────────────────

  describe('GET /api/goals/progress', () => {
    it('returns all goals for the user', async () => {
      const res = await request(app)
        .get('/api/goals/progress')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((g: any) => expect(g.userId).toBe(userId));
    });
  });

  // ── Auto update ───────────────────────────────────────────────────────────

  describe('POST /api/goals/auto-update', () => {
    it('returns processed/completedCount/failedCount', async () => {
      const res = await request(app)
        .post('/api/goals/auto-update')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('processed');
      expect(res.body).toHaveProperty('completedCount');
      expect(res.body).toHaveProperty('failedCount');
    });

    it('marks an expired completed goal as completed', async () => {
      // Create a goal that expired yesterday and was achieved
      const goal = await prisma.goal.create({
        data: {
          userId,
          title: 'Expired completed goal',
          period: 'daily',
          targetHours: 4,
          achievedHours: 5, // achieved > target
          status: 'active',
          startDate: new Date(Date.now() - 2 * 86400000),
          endDate: new Date(Date.now() - 86400000), // yesterday
        },
      });

      const res = await request(app)
        .post('/api/goals/auto-update')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.completedCount).toBeGreaterThanOrEqual(1);

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated?.status).toBe('completed');
    });

    it('marks an expired failed goal as failed', async () => {
      const goal = await prisma.goal.create({
        data: {
          userId,
          title: 'Expired failed goal',
          period: 'daily',
          targetHours: 10,
          achievedHours: 2, // below target
          status: 'active',
          startDate: new Date(Date.now() - 3 * 86400000),
          endDate: new Date(Date.now() - 86400000),
        },
      });

      await request(app)
        .post('/api/goals/auto-update')
        .set('Authorization', `Bearer ${token}`);

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated?.status).toBe('failed');
    });

    it('does not affect active non-expired goals', async () => {
      const goal = await prisma.goal.create({
        data: {
          userId,
          title: 'Still active goal',
          period: 'weekly',
          targetHours: 20,
          achievedHours: 5,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 86400000),
        },
      });

      await request(app)
        .post('/api/goals/auto-update')
        .set('Authorization', `Bearer ${token}`);

      const updated = await prisma.goal.findUnique({ where: { id: goal.id } });
      expect(updated?.status).toBe('active');
    });
  });
});
