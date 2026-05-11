import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

const app = express();
app.use(express.json());

function getUserId(req: any): number {
  const token = req.headers.authorization?.split(' ')[1];
  return (jwt.verify(token, JWT_SECRET) as any).userId;
}

// Auth
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed } });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// Task routes
app.get('/api/tasks', async (req, res) => {
  try {
    const userId = getUserId(req);
    const tasks = await prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    res.json(tasks);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, target, unit, type, mandatory } = req.body;
    if (!title || target === undefined || !unit || !type) {
      return res.status(400).json({ error: 'title, target, unit, and type are required' });
    }
    const task = await prisma.task.create({
      data: { userId, title, target, unit, type, mandatory: mandatory ?? false }
    });
    res.status(201).json(task);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
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
        return res.status(400).json({ error: 'Reason is required for deleting non-mandatory tasks' });
      }
    }

    await prisma.deleteRequest.create({ data: { userId, taskId, taskTitle: task.title, reason } });
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

app.post('/api/tasks/:id/complete', async (req, res) => {
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

app.get('/api/tasks/completions/today', async (req, res) => {
  try {
    const userId = getUserId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completions = await prisma.taskCompletion.findMany({
      where: { task: { userId }, date: today },
      include: { task: true }
    });
    res.json(completions);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

describe('Task API Tests', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const email = `task-api-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: 'Task API User', email, password: 'password123' });
    expect(res.status).toBe(201);
    token = res.body.token;
    userId = (jwt.verify(token, JWT_SECRET) as any).userId;
  });

  describe('POST /api/tasks', () => {
    it('rejects without token', async () => {
      const res = await request(app).post('/api/tasks').send({ title: 'Test', target: 10, unit: 'hours', type: 'work' });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects missing required fields', async () => {
      const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({ title: 'Missing type' });
      expect(res.status).toBe(400);
    });

    it('creates task with type field', async () => {
      const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
        title: 'Work task', target: 10, unit: 'hours', type: 'work'
      });
      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Work task');
      expect(res.body.type).toBe('work');
      expect(res.body.unit).toBe('hours');
      expect(res.body.userId).toBe(userId);
    });

    it('creates task with mandatory flag', async () => {
      const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
        title: 'Mandatory task', target: 5, unit: 'pages', type: 'other', mandatory: true
      });
      expect(res.status).toBe(201);
      expect(res.body.mandatory).toBe(true);
    });
  });

  describe('GET /api/tasks', () => {
    it('returns array of tasks', async () => {
      const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((t: any) => expect(t.userId).toBe(userId));
    });
  });

  describe('POST /api/tasks/:id/complete', () => {
    let taskId: number;

    beforeEach(async () => {
      const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
        title: 'Completion test', target: 10, unit: 'hours', type: 'work'
      });
      taskId = res.body.id;
    });

    it('logs completion', async () => {
      const res = await request(app).post(`/api/tasks/${taskId}/complete`).set('Authorization', `Bearer ${token}`).send({ achieved: 5 });
      expect(res.status).toBe(200);
      expect(res.body.achieved).toBe(5);
      expect(res.body.completed).toBe(true);
    });

    it('marks as not completed when achieved is 0', async () => {
      const res = await request(app).post(`/api/tasks/${taskId}/complete`).set('Authorization', `Bearer ${token}`).send({ achieved: 0 });
      expect(res.body.completed).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('rejects without reason for non-mandatory task', async () => {
      const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
        title: 'Non-mandatory', target: 5, unit: 'pages', type: 'other'
      });
      const taskId = res.body.id;
      const delRes = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ reason: '' });
      expect(delRes.status).toBe(400);
    });

    it('rejects with short reason for mandatory task', async () => {
      const res = await request(app).post('/api/tasks').set('Authorization', `Bearer ${token}`).send({
        title: 'Mandatory task', target: 5, unit: 'pages', type: 'other', mandatory: true
      });
      const taskId = res.body.id;
      const delRes = await request(app).delete(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${token}`).send({ reason: 'Too short' });
      expect(delRes.status).toBe(400);
    });
  });
});
