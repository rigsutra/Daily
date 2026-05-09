import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

const app = express();
app.use(express.json());

// Extract userId from Bearer token
function getUserId(req: any): number {
  const token = req.headers.authorization?.split(' ')[1];
  return (jwt.verify(token, JWT_SECRET) as any).userId;
}

// Auth routes
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

// Task routes
app.get('/api/tasks', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const tasks = await prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    res.json(tasks);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/tasks', async (req: any, res: any) => {
  let userId: number;
  try {
    userId = getUserId(req);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { title, target, unit, mandatory } = req.body;
    if (!title || target === undefined || !unit) {
      return res.status(400).json({ error: 'title, target, and unit are required' });
    }
    const task = await prisma.task.create({
      data: { userId, title, target, unit, mandatory: mandatory ?? false },
    });
    res.status(201).json(task);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/tasks/completions/today', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: today },
      include: { task: true },
    });
    res.json(completions);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/tasks/:id/complete', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const taskId = parseInt(req.params.id);
    const { achieved } = req.body;
    if (achieved === undefined) return res.status(400).json({ error: 'achieved is required' });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) return res.status(404).json({ error: 'Task not found' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completion = await prisma.taskCompletion.upsert({
      where: { taskId_date: { taskId, date: today } },
      update: { achieved, completed: achieved > 0 },
      create: { taskId, date: today, achieved, completed: achieved > 0 },
    });
    res.json(completion);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const taskId = parseInt(req.params.id);
    const { reason } = req.body;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) return res.status(404).json({ error: 'Task not found' });

    if (task.mandatory) {
      if (!reason || reason.length < 1000) {
        return res.status(400).json({ error: 'Reason must be at least 1000 characters for mandatory tasks' });
      }
    } else {
      if (!reason || reason.trim() === '') {
        return res.status(400).json({ error: 'Reason is required' });
      }
    }

    await prisma.deleteRequest.create({ data: { userId, taskId, reason } });
    await prisma.$transaction([
      prisma.taskCompletion.deleteMany({ where: { taskId } }),
      prisma.deleteRequest.deleteMany({ where: { taskId } }),
      prisma.task.delete({ where: { id: taskId } }),
    ]);

    res.json({ message: 'Task deleted' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Dashboard daily route — mirrors dashboardService.getDaily logic
app.get('/api/dashboard/daily', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const entry = await prisma.dailyEntry.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    const timerSessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: today, lte: endOfToday } },
    });

    const taskCompletions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: { gte: today, lte: endOfToday } },
      include: { task: true },
    });

    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    const timerMinutes = timerSessions.reduce((sum: number, s: any) => sum + (s.duration ?? 0), 0);
    const completedTasks = taskCompletions.filter((c: any) => c.completed).length;
    const totalTasks = taskCompletions.length;
    const productivityScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const dayOfWeek = today.getDay();
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const totalHours = isWeekday ? 5.5 : 24;

    const taskHours = taskCompletions.reduce((sum: number, c: any) => {
      if (c.task && c.task.unit === 'hours') return sum + c.achieved;
      return sum;
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

// ─────────────────────────────────────────────────────────────────────────────
// Test suite
// ─────────────────────────────────────────────────────────────────────────────

describe('Task CRUD + Dashboard Reflection', () => {
  let token: string;
  let userId: number;
  const createdTaskIds: number[] = [];

  // Register a dedicated test user once for this suite
  beforeAll(async () => {
    const email = `task-dashboard-${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dashboard Test User', email, password: 'password123' });

    expect(res.status).toBe(201);
    token = res.body.token;
    userId = (jwt.verify(token, JWT_SECRET) as any).userId;
  });

  // ── CREATE ────────────────────────────────────────────────────────────────

  describe('CREATE tasks', () => {
    it('creates a non-mandatory task (study, units)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Read 30 pages', target: 30, unit: 'pages' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ title: 'Read 30 pages', target: 30, unit: 'pages', mandatory: false, userId });
      expect(res.body.id).toBeDefined();
      createdTaskIds.push(res.body.id);
    });

    it('creates a task tracked in hours', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Deep work', target: 2, unit: 'hours' });

      expect(res.status).toBe(201);
      expect(res.body.unit).toBe('hours');
      createdTaskIds.push(res.body.id);
    });

    it('creates a mandatory task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Morning exercise', target: 1, unit: 'session', mandatory: true });

      expect(res.status).toBe(201);
      expect(res.body.mandatory).toBe(true);
      createdTaskIds.push(res.body.id);
    });

    it('rejects a task missing required fields', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Incomplete task' }); // missing target and unit

      expect(res.status).toBe(400);
    });

    it('rejects request with no auth token', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'No auth', target: 1, unit: 'hours' });

      expect(res.status).toBe(401);
    });
  });

  // ── READ ─────────────────────────────────────────────────────────────────

  describe('READ tasks', () => {
    it('returns all tasks for the user', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // All three tasks created above should be here
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      const ids = res.body.map((t: any) => t.id);
      for (const id of createdTaskIds) {
        expect(ids).toContain(id);
      }
    });

    it('returns no completions for today before any are logged', async () => {
      const res = await request(app)
        .get('/api/tasks/completions/today')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // None of our new tasks have completions yet
      const ourTaskIds = new Set(createdTaskIds);
      const ourCompletions = res.body.filter((c: any) => ourTaskIds.has(c.taskId));
      expect(ourCompletions.length).toBe(0);
    });

    it('dashboard starts with 0 task counts for this user', async () => {
      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      // No completions logged yet → totalTasks = 0
      expect(res.body.totalTasks).toBe(0);
      expect(res.body.completedTasks).toBe(0);
      expect(res.body.productivityScore).toBe(0);
    });
  });

  // ── LOG COMPLETIONS (update-equivalent) + DASHBOARD REFLECTION ───────────

  describe('LOG completions and dashboard reflection', () => {
    it('logs partial completion for "Read 30 pages" and dashboard reflects it', async () => {
      const taskId = createdTaskIds[0]; // Read 30 pages, target 30

      const completeRes = await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achieved: 15 }); // half done

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.achieved).toBe(15);
      expect(completeRes.body.completed).toBe(true); // achieved > 0

      // Today's completions should now include this task
      const todayRes = await request(app)
        .get('/api/tasks/completions/today')
        .set('Authorization', `Bearer ${token}`);

      expect(todayRes.status).toBe(200);
      const found = todayRes.body.find((c: any) => c.taskId === taskId);
      expect(found).toBeDefined();
      expect(found.achieved).toBe(15);

      // Dashboard: 1 completion logged, 1 completed (achieved > 0)
      const dashRes = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.totalTasks).toBe(1);
      expect(dashRes.body.completedTasks).toBe(1);
      expect(dashRes.body.productivityScore).toBe(100);
    });

    it('logs completion for "Deep work" (hours unit) and hoursUsed increases', async () => {
      const taskId = createdTaskIds[1]; // Deep work, target 2 hours

      const beforeDash = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);
      const hoursBefore = beforeDash.body.hoursUsed;

      const completeRes = await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achieved: 2 }); // full 2 hours

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.completed).toBe(true);

      const afterDash = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      // hoursUsed should increase by 2 (hours unit)
      expect(afterDash.body.hoursUsed).toBeCloseTo(hoursBefore + 2, 1);
      expect(afterDash.body.totalTasks).toBe(2);
      expect(afterDash.body.completedTasks).toBe(2);
      expect(afterDash.body.productivityScore).toBe(100);
    });

    it('logs completion for mandatory task and dashboard shows all 3 tasks', async () => {
      const taskId = createdTaskIds[2]; // Morning exercise

      const completeRes = await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achieved: 1 });

      expect(completeRes.status).toBe(200);

      const dashRes = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(dashRes.body.totalTasks).toBe(3);
      expect(dashRes.body.completedTasks).toBe(3);
      expect(dashRes.body.productivityScore).toBe(100);
    });

    it('updating a completion to 0 marks it as not completed', async () => {
      const taskId = createdTaskIds[0]; // Read 30 pages

      await request(app)
        .post(`/api/tasks/${taskId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achieved: 0 }); // reset to 0

      const todayRes = await request(app)
        .get('/api/tasks/completions/today')
        .set('Authorization', `Bearer ${token}`);

      const found = todayRes.body.find((c: any) => c.taskId === taskId);
      expect(found.achieved).toBe(0);
      expect(found.completed).toBe(false);

      // Dashboard: 3 total, only 2 completed now
      const dashRes = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(dashRes.body.totalTasks).toBe(3);
      expect(dashRes.body.completedTasks).toBe(2);
      expect(dashRes.body.productivityScore).toBe(67); // 2/3 rounded
    });

    it('rejects completion for a task that does not belong to this user', async () => {
      const otherUserEmail = `other-${Date.now()}@example.com`;
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Other User', email: otherUserEmail, password: 'password123' });

      const otherToken = regRes.body.token;
      const otherTaskRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ title: 'Other task', target: 1, unit: 'hours' });

      const otherTaskId = otherTaskRes.body.id;

      // Try to complete other user's task with our token
      const res = await request(app)
        .post(`/api/tasks/${otherTaskId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ achieved: 1 });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  describe('DELETE tasks and dashboard reflection', () => {
    it('rejects deleting a non-mandatory task without a reason', async () => {
      const taskId = createdTaskIds[0];

      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/reason/i);
    });

    it('rejects deleting a mandatory task with a reason shorter than 1000 chars', async () => {
      const taskId = createdTaskIds[2]; // mandatory

      const res = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Too short' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/1000 characters/i);
    });

    it('deletes a non-mandatory task and dashboard removes its completion', async () => {
      const taskId = createdTaskIds[0]; // Read 30 pages (non-mandatory)

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'No longer tracking this goal' });

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Task deleted');

      // Task should not appear in GET /api/tasks
      const tasksRes = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);

      const ids = tasksRes.body.map((t: any) => t.id);
      expect(ids).not.toContain(taskId);

      // Dashboard: task + its completion are gone — totalTasks drops by 1
      const dashRes = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      // Was 3 total (2 completed); now 2 total (both completed = 100%)
      expect(dashRes.body.totalTasks).toBe(2);
      expect(dashRes.body.completedTasks).toBe(2);
      expect(dashRes.body.productivityScore).toBe(100);
    });

    it('deletes the mandatory task with a long enough reason and dashboard updates', async () => {
      const taskId = createdTaskIds[2]; // Morning exercise (mandatory)
      const longReason = 'This is a detailed reason for deleting the mandatory task. '.repeat(20); // > 1000 chars

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: longReason });

      expect(deleteRes.status).toBe(200);

      // Task gone from list
      const tasksRes = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);
      const ids = tasksRes.body.map((t: any) => t.id);
      expect(ids).not.toContain(taskId);

      // Dashboard: only "Deep work" task remains (1 total, 1 completed)
      const dashRes = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(dashRes.body.totalTasks).toBe(1);
      expect(dashRes.body.completedTasks).toBe(1);
      expect(dashRes.body.productivityScore).toBe(100);
      // hoursUsed still includes the 2 hours from "Deep work"
      expect(dashRes.body.hoursUsed).toBeGreaterThanOrEqual(2);
    });

    it('deletes the last task and dashboard returns to 0 task counts', async () => {
      const taskId = createdTaskIds[1]; // Deep work (non-mandatory)

      const deleteRes = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Finished the habit — no longer need to track' });

      expect(deleteRes.status).toBe(200);

      const dashRes = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);

      expect(dashRes.body.totalTasks).toBe(0);
      expect(dashRes.body.completedTasks).toBe(0);
      expect(dashRes.body.productivityScore).toBe(0);
      // No hour-unit tasks → hoursUsed back to 0 from tasks
      expect(dashRes.body.hoursUsed).toBe(0);
    });

    it('returns 404 when deleting a task that does not exist', async () => {
      const res = await request(app)
        .delete('/api/tasks/999999')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Should not exist' });

      expect(res.status).toBe(404);
    });
  });
});
