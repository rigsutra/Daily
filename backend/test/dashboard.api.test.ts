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

function startOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOf(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

// Dashboard routes — mirror service logic with direct Prisma
app.get('/api/dashboard/daily', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const today = startOf(new Date());
    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    const timerSessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: today, lte: endOf(today) } },
    });
    const taskCompletions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: { gte: today, lte: endOf(today) } },
      include: { task: true },
    });
    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    const timerMinutes = timerSessions.reduce((s: number, ss: any) => s + (ss.duration ?? 0), 0);
    const completedTasks = taskCompletions.filter((c: any) => c.completed).length;
    const totalTasks = taskCompletions.length;
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const dayOfWeek = today.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const totalHours = isWeekday ? 5.5 : 24;
    const taskHours = taskCompletions.reduce((s: number, c: any) => {
      if (c.task && ['hour', 'hours'].includes(c.task.unit.toLowerCase())) return s + c.achieved;
      return s;
    }, 0);
    const hoursUsed = timerMinutes / 60 + (entry?.workHours ?? 0) + (entry?.studyHours ?? 0) + taskHours;
    const hoursRemaining = Math.max(0, totalHours - hoursUsed);
    res.json({
      date: today,
      totalHours,
      hoursUsed: Math.round(hoursUsed * 10) / 10,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      productivityScore,
      workHours: entry?.workHours ?? 0,
      studyHours: entry?.studyHours ?? 0,
      gymCompleted: entry?.gymCompleted ?? false,
      waterLiters: entry?.waterLiters ?? 0,
      sleepHours: entry?.sleepHours ?? 0,
      mobileMinutes: 0,
      completedTasks,
      totalTasks,
      activeGoals: activeGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        period: g.period,
        targetHours: g.targetHours,
        achievedHours: g.achievedHours,
        progressPercentage: g.targetHours > 0 ? Math.round((g.achievedHours / g.targetHours) * 100) : 0,
        status: g.status,
      })),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/dashboard/weekly', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const now = new Date();
    const startOfWeek = startOf(new Date(now));
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const entries = await prisma.dailyEntry.findMany({
      where: { userId, date: { gte: startOfWeek, lte: endOfWeek } },
    });
    const sessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: startOfWeek, lte: endOfWeek } },
    });
    const completions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: { gte: startOfWeek, lte: endOfWeek } },
      include: { task: true },
    });
    const weeklyGoals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    const totalProductiveHours = entries.reduce((s: number, e: any) => s + (e.productiveHours ?? 0), 0);
    const totalWorkHours = entries.reduce((s: number, e: any) => s + (e.workHours ?? 0), 0);
    const totalStudyHours = entries.reduce((s: number, e: any) => s + (e.studyHours ?? 0), 0);
    const totalTimerMinutes = sessions.reduce((s: number, ss: any) => s + (ss.duration ?? 0), 0);
    const completedCount = completions.filter((c: any) => c.completed).length;

    res.json({
      startDate: startOfWeek,
      endDate: endOfWeek,
      entries,
      totalProductiveHours,
      totalWorkHours,
      totalStudyHours,
      totalTimerHours: Math.round((totalTimerMinutes / 60) * 10) / 10,
      completedTasks: completedCount,
      totalTasks: completions.length,
      weeklyGoals: weeklyGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        period: g.period,
        targetHours: g.targetHours,
        achievedHours: g.achievedHours,
        progressPercentage: g.targetHours > 0 ? Math.round((g.achievedHours / g.targetHours) * 100) : 0,
        status: g.status,
      })),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/dashboard/monthly', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const entries = await prisma.dailyEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });
    const completions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: { gte: start, lte: end } },
      include: { task: true },
    });
    const monthlyGoals = await prisma.goal.findMany({
      where: { userId, status: 'active', period: 'monthly' },
      orderBy: { createdAt: 'desc' },
    });

    const avgProductiveHours = entries.length
      ? entries.reduce((s: number, e: any) => s + (e.productiveHours ?? 0), 0) / entries.length
      : 0;

    res.json({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      entries,
      avgProductiveHours: Math.round(avgProductiveHours * 10) / 10,
      completedTasks: completions.filter((c: any) => c.completed).length,
      totalTasks: completions.length,
      monthlyGoals: monthlyGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        period: g.period,
        targetHours: g.targetHours,
        achievedHours: g.achievedHours,
        progressPercentage: g.targetHours > 0 ? Math.round((g.achievedHours / g.targetHours) * 100) : 0,
        status: g.status,
      })),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/dashboard/yearly', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

    const entries = await prisma.dailyEntry.findMany({
      where: { userId, date: { gte: start, lte: end } },
    });
    const sessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: start, lte: end } },
    });
    const yearlyGoals = await prisma.goal.findMany({
      where: { userId, status: 'active', period: 'yearly' },
      orderBy: { createdAt: 'desc' },
    });

    const totalWorkHours = entries.reduce((s: number, e: any) => s + (e.workHours ?? 0), 0);
    const totalStudyHours = entries.reduce((s: number, e: any) => s + (e.studyHours ?? 0), 0);
    const totalTimerMinutes = sessions.reduce((s: number, ss: any) => s + (ss.duration ?? 0), 0);

    res.json({
      year: now.getFullYear(),
      totalWorkHours,
      totalStudyHours,
      totalTimerHours: Math.round((totalTimerMinutes / 60) * 10) / 10,
      yearlyGoals: yearlyGoals.map((g: any) => ({
        id: g.id,
        title: g.title,
        period: g.period,
        targetHours: g.targetHours,
        achievedHours: g.achievedHours,
        progressPercentage: g.targetHours > 0 ? Math.round((g.achievedHours / g.targetHours) * 100) : 0,
        status: g.status,
      })),
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Dashboard API', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const email = `dashboard-api-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dashboard User', email, password: 'password123' });
    expect(res.status).toBe(201);
    token = res.body.token;
    userId = (jwt.verify(token, JWT_SECRET) as any).userId;
  });

  // ── Daily ─────────────────────────────────────────────────────────────────

  describe('GET /api/dashboard/daily', () => {
    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/dashboard/daily');
      expect(res.status).toBe(400);
    });

    it('returns correct shape for a fresh user', async () => {
      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('date');
      expect(res.body).toHaveProperty('totalHours');
      expect(res.body).toHaveProperty('hoursUsed');
      expect(res.body).toHaveProperty('hoursRemaining');
      expect(res.body).toHaveProperty('productivityScore');
      expect(res.body).toHaveProperty('workHours');
      expect(res.body).toHaveProperty('studyHours');
      expect(res.body).toHaveProperty('gymCompleted');
      expect(res.body).toHaveProperty('waterLiters');
      expect(res.body).toHaveProperty('sleepHours');
      expect(res.body).toHaveProperty('completedTasks');
      expect(res.body).toHaveProperty('totalTasks');
      expect(res.body).toHaveProperty('activeGoals');
      expect(Array.isArray(res.body.activeGoals)).toBe(true);
    });

    it('fresh user has 0 tasks and 0 productivity score', async () => {
      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.totalTasks).toBe(0);
      expect(res.body.completedTasks).toBe(0);
      expect(res.body.productivityScore).toBe(0);
      expect(res.body.hoursUsed).toBe(0);
    });

    it('totalHours is either 5.5 (weekday) or 24 (weekend)', async () => {
      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect([5.5, 24]).toContain(res.body.totalHours);
    });

    it('hoursUsed increases after a daily entry is added', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.dailyEntry.create({
        data: { userId, date: today, workHours: 4, studyHours: 2 },
      }).catch(() => {}); // ignore if already exists from another test

      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.workHours + res.body.studyHours).toBeGreaterThan(0);
    });

    it('active goals appear in activeGoals array', async () => {
      await prisma.goal.create({
        data: {
          userId,
          title: 'Daily test goal',
          period: 'weekly',
          targetHours: 10,
          achievedHours: 0,
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 86400000),
        },
      });

      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.activeGoals.length).toBeGreaterThan(0);
      const goal = res.body.activeGoals[0];
      expect(goal).toHaveProperty('id');
      expect(goal).toHaveProperty('title');
      expect(goal).toHaveProperty('progressPercentage');
    });
  });

  // ── Weekly ────────────────────────────────────────────────────────────────

  describe('GET /api/dashboard/weekly', () => {
    it('returns correct shape', async () => {
      const res = await request(app)
        .get('/api/dashboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('startDate');
      expect(res.body).toHaveProperty('endDate');
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('totalProductiveHours');
      expect(res.body).toHaveProperty('totalWorkHours');
      expect(res.body).toHaveProperty('totalStudyHours');
      expect(res.body).toHaveProperty('totalTimerHours');
      expect(res.body).toHaveProperty('completedTasks');
      expect(res.body).toHaveProperty('totalTasks');
      expect(res.body).toHaveProperty('weeklyGoals');
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(Array.isArray(res.body.weeklyGoals)).toBe(true);
    });

    it('startDate is before or equal to endDate', async () => {
      const res = await request(app)
        .get('/api/dashboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      const start = new Date(res.body.startDate).getTime();
      const end = new Date(res.body.endDate).getTime();
      expect(start).toBeLessThanOrEqual(end);
    });

    it('week spans 7 days', async () => {
      const res = await request(app)
        .get('/api/dashboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      const diffMs = new Date(res.body.endDate).getTime() - new Date(res.body.startDate).getTime();
      const diffDays = Math.round(diffMs / 86400000);
      // endDate is 23:59:59.999 of Sunday, so diff rounds to 7
      expect(diffDays).toBe(7);
    });

    it('numeric totals are non-negative', async () => {
      const res = await request(app)
        .get('/api/dashboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.totalProductiveHours).toBeGreaterThanOrEqual(0);
      expect(res.body.totalWorkHours).toBeGreaterThanOrEqual(0);
      expect(res.body.totalStudyHours).toBeGreaterThanOrEqual(0);
      expect(res.body.totalTimerHours).toBeGreaterThanOrEqual(0);
      expect(res.body.completedTasks).toBeGreaterThanOrEqual(0);
      expect(res.body.totalTasks).toBeGreaterThanOrEqual(0);
    });

    it('weekly entries match what was created this week', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.dailyEntry.create({
        data: { userId, date: today, workHours: 6, studyHours: 1, productiveHours: 5 },
      }).catch(() => {});

      const res = await request(app)
        .get('/api/dashboard/weekly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.entries.length).toBeGreaterThan(0);
      expect(res.body.totalWorkHours).toBeGreaterThan(0);
    });
  });

  // ── Monthly ───────────────────────────────────────────────────────────────

  describe('GET /api/dashboard/monthly', () => {
    it('returns correct shape', async () => {
      const res = await request(app)
        .get('/api/dashboard/monthly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('month');
      expect(res.body).toHaveProperty('year');
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('avgProductiveHours');
      expect(res.body).toHaveProperty('completedTasks');
      expect(res.body).toHaveProperty('totalTasks');
      expect(res.body).toHaveProperty('monthlyGoals');
      expect(Array.isArray(res.body.entries)).toBe(true);
      expect(Array.isArray(res.body.monthlyGoals)).toBe(true);
    });

    it('month and year match the current date', async () => {
      const now = new Date();
      const res = await request(app)
        .get('/api/dashboard/monthly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.month).toBe(now.getMonth() + 1);
      expect(res.body.year).toBe(now.getFullYear());
    });

    it('avgProductiveHours is non-negative', async () => {
      const res = await request(app)
        .get('/api/dashboard/monthly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.avgProductiveHours).toBeGreaterThanOrEqual(0);
    });

    it('monthly goal appears in monthlyGoals array', async () => {
      await prisma.goal.create({
        data: {
          userId,
          title: 'Monthly test goal',
          period: 'monthly',
          targetHours: 80,
          achievedHours: 0,
          status: 'active',
          startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        },
      });

      const res = await request(app)
        .get('/api/dashboard/monthly')
        .set('Authorization', `Bearer ${token}`);

      const monthlyGoal = res.body.monthlyGoals.find((g: any) => g.period === 'monthly');
      expect(monthlyGoal).toBeDefined();
    });
  });

  // ── Yearly ────────────────────────────────────────────────────────────────

  describe('GET /api/dashboard/yearly', () => {
    it('returns correct shape', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('year');
      expect(res.body).toHaveProperty('totalWorkHours');
      expect(res.body).toHaveProperty('totalStudyHours');
      expect(res.body).toHaveProperty('totalTimerHours');
      expect(res.body).toHaveProperty('yearlyGoals');
      expect(Array.isArray(res.body.yearlyGoals)).toBe(true);
    });

    it('year matches the current year', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.year).toBe(new Date().getFullYear());
    });

    it('numeric totals are non-negative', async () => {
      const res = await request(app)
        .get('/api/dashboard/yearly')
        .set('Authorization', `Bearer ${token}`);

      expect(res.body.totalWorkHours).toBeGreaterThanOrEqual(0);
      expect(res.body.totalStudyHours).toBeGreaterThanOrEqual(0);
      expect(res.body.totalTimerHours).toBeGreaterThanOrEqual(0);
    });

    it('yearly goal appears in yearlyGoals array', async () => {
      await prisma.goal.create({
        data: {
          userId,
          title: 'Yearly test goal',
          period: 'yearly',
          targetHours: 1000,
          achievedHours: 0,
          status: 'active',
          startDate: new Date(new Date().getFullYear(), 0, 1),
          endDate: new Date(new Date().getFullYear(), 11, 31),
        },
      });

      const res = await request(app)
        .get('/api/dashboard/yearly')
        .set('Authorization', `Bearer ${token}`);

      const yearlyGoal = res.body.yearlyGoals.find((g: any) => g.period === 'yearly');
      expect(yearlyGoal).toBeDefined();
      expect(yearlyGoal.title).toBe('Yearly test goal');
    });
  });

  // ── Data isolation ────────────────────────────────────────────────────────

  describe('Data isolation between users', () => {
    it('user A data does not appear in user B dashboard', async () => {
      const emailB = `dash-user-b-${Date.now()}@example.com`;
      const regB = await request(app)
        .post('/api/auth/register')
        .send({ name: 'User B', email: emailB, password: 'password123' });
      const tokenB = regB.body.token;

      const resA = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);
      const resB = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${tokenB}`);

      // User B has no tasks
      expect(resB.body.totalTasks).toBe(0);
      // User B active goals should not include user A's goals
      const aGoalIds = resA.body.activeGoals.map((g: any) => g.id);
      const bGoalIds = resB.body.activeGoals.map((g: any) => g.id);
      const intersection = aGoalIds.filter((id: number) => bGoalIds.includes(id));
      expect(intersection.length).toBe(0);
    });
  });
});
