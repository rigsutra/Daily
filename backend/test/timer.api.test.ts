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

// Timer routes
app.post('/api/timer/start', async (req, res) => {
  try {
    const userId = getUserId(req);
    const type = req.body.type ?? 'work';
    const active = await prisma.timerSession.findFirst({ where: { userId, endTime: null } });
    if (active) {
      if (active.paused) {
        const session = await prisma.timerSession.update({
          where: { id: active.id },
          data: { paused: false, startTime: new Date() }
        });
        return res.status(201).json(session);
      }
      return res.status(400).json({ error: 'A timer is already running. Stop it first.' });
    }
    const session = await prisma.timerSession.create({
      data: { userId, type, startTime: new Date(), paused: false }
    });
    res.status(201).json(session);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/timer/pause', async (req, res) => {
  try {
    const userId = getUserId(req);
    const active = await prisma.timerSession.findFirst({ where: { userId, endTime: null } });
    if (!active) return res.status(400).json({ error: 'No active timer' });
    const duration = Math.floor((Date.now() - active.startTime.getTime()) / 60000);
    const session = await prisma.timerSession.update({
      where: { id: active.id },
      data: { paused: true, duration }
    });
    res.json(session);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/timer/stop', async (req, res) => {
  try {
    const userId = getUserId(req);
    const active = await prisma.timerSession.findFirst({ where: { userId, endTime: null } });
    if (!active) return res.status(400).json({ error: 'No active timer' });
    const endTime = new Date();
    const additionalMinutes = Math.floor((endTime.getTime() - active.startTime.getTime()) / 60000);
    const duration = (active.duration ?? 0) + additionalMinutes;
    const session = await prisma.timerSession.update({
      where: { id: active.id },
      data: { endTime, duration }
    });
    res.json(session);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/timer/active', async (req, res) => {
  try {
    const userId = getUserId(req);
    const session = await prisma.timerSession.findFirst({ where: { userId, endTime: null } });
    res.json(session);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.get('/api/timer/today', async (req, res) => {
  try {
    const userId = getUserId(req);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: today } },
      orderBy: { startTime: 'asc' }
    });
    res.json(sessions);
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

describe('Timer API', () => {
  let token: string;
  let userId: number;

  beforeAll(async () => {
    const email = `timer-api-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: 'Timer API User', email, password: 'password123' });
    expect(res.status).toBe(201);
    token = res.body.token;
    userId = (jwt.verify(token, JWT_SECRET) as any).userId;
  });

  describe('Authentication guard', () => {
    it('rejects start without token', async () => {
      const res = await request(app).post('/api/timer/start').send({ type: 'work' });
      expect(res.status).toBe(400);
    });

    it('rejects active without token', async () => {
      const res = await request(app).get('/api/timer/active');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/timer/start', () => {
    afterEach(async () => {
      await prisma.timerSession.updateMany({
        where: { userId, endTime: null },
        data: { endTime: new Date(), duration: 0 }
      });
    });

    it('starts a work session and returns 201 with session data', async () => {
      const res = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('work');
      expect(res.body.userId).toBe(userId);
      expect(res.body.endTime).toBeNull();
      expect(res.body.paused).toBe(false);
    });

    it('starts a study session', async () => {
      const res = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'study' });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('study');
    });

    it('starts a break session', async () => {
      const res = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'break' });
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('break');
    });

    it('defaults to work type when no type provided', async () => {
      const res = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({});
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('work');
    });

    it('rejects starting when a session is already running', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      const res = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'study' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already running/i);
    });
  });

  describe('GET /api/timer/active', () => {
    afterEach(async () => {
      await prisma.timerSession.updateMany({
        where: { userId, endTime: null },
        data: { endTime: new Date(), duration: 0 }
      });
    });

    it('returns null when no session is active', async () => {
      const res = await request(app).get('/api/timer/active').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });

    it('returns the running session', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'study' });
      const res = await request(app).get('/api/timer/active').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toBeNull();
      expect(res.body.type).toBe('study');
      expect(res.body.endTime).toBeNull();
    });
  });

  describe('POST /api/timer/pause', () => {
    afterEach(async () => {
      await prisma.timerSession.updateMany({
        where: { userId, endTime: null },
        data: { endTime: new Date(), duration: 0 }
      });
    });

    it('returns 400 when no timer is running', async () => {
      const res = await request(app).post('/api/timer/pause').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no active timer/i);
    });

    it('pauses a running session', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      const pauseRes = await request(app).post('/api/timer/pause').set('Authorization', `Bearer ${token}`);
      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.paused).toBe(true);
    });

    it('paused session is still returned as active (endTime null)', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      await request(app).post('/api/timer/pause').set('Authorization', `Bearer ${token}`);
      const activeRes = await request(app).get('/api/timer/active').set('Authorization', `Bearer ${token}`);
      expect(activeRes.body).not.toBeNull();
      expect(activeRes.body.paused).toBe(true);
      expect(activeRes.body.endTime).toBeNull();
    });
  });

  describe('Resume via POST /api/timer/start (when paused)', () => {
    afterEach(async () => {
      await prisma.timerSession.updateMany({
        where: { userId, endTime: null },
        data: { endTime: new Date(), duration: 0 }
      });
    });

    it('resumes a paused session and returns paused: false', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      await request(app).post('/api/timer/pause').set('Authorization', `Bearer ${token}`);
      const resumeRes = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      expect(resumeRes.status).toBe(201);
      expect(resumeRes.body.paused).toBe(false);
    });
  });

  describe('POST /api/timer/stop', () => {
    it('returns 400 when no timer is running', async () => {
      await prisma.timerSession.updateMany({
        where: { userId, endTime: null },
        data: { endTime: new Date(), duration: 0 }
      });
      const res = await request(app).post('/api/timer/stop').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/no active timer/i);
    });

    it('stops a running session — sets endTime and duration', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      const stopRes = await request(app).post('/api/timer/stop').set('Authorization', `Bearer ${token}`);
      expect(stopRes.status).toBe(200);
      expect(stopRes.body.endTime).not.toBeNull();
      expect(typeof stopRes.body.duration).toBe('number');
    });

    it('after stopping, active returns null', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      await request(app).post('/api/timer/stop').set('Authorization', `Bearer ${token}`);
      const activeRes = await request(app).get('/api/timer/active').set('Authorization', `Bearer ${token}`);
      expect(activeRes.body).toBeNull();
    });

    it('stopped session appears in today sessions', async () => {
      await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      await request(app).post('/api/timer/stop').set('Authorization', `Bearer ${token}`);
      const todayRes = await request(app).get('/api/timer/today').set('Authorization', `Bearer ${token}`);
      expect(todayRes.status).toBe(200);
      expect(Array.isArray(todayRes.body)).toBe(true);
      expect(todayRes.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/timer/today', () => {
    it('returns an array (possibly empty)', async () => {
      const res = await request(app).get('/api/timer/today').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('only returns sessions for today (not yesterday)', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(10, 0, 0, 0);
      await prisma.timerSession.create({
        data: { userId, type: 'work', startTime: yesterday, endTime: new Date(yesterday.getTime() + 3600000), duration: 60, paused: false }
      });
      const todayRes = await request(app).get('/api/timer/today').set('Authorization', `Bearer ${token}`);
      todayRes.body.forEach((s: any) => {
        const sessionDate = new Date(s.startTime);
        const today = new Date();
        expect(sessionDate.getDate()).toBe(today.getDate());
        expect(sessionDate.getMonth()).toBe(today.getMonth());
        expect(sessionDate.getFullYear()).toBe(today.getFullYear());
      });
    });
  });

  describe('Full workflow', () => {
    it('completes start → pause → resume → stop without errors', async () => {
      await prisma.timerSession.updateMany({
        where: { userId, endTime: null },
        data: { endTime: new Date(), duration: 0 }
      });
      const startRes = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      expect(startRes.status).toBe(201);
      const pauseRes = await request(app).post('/api/timer/pause').set('Authorization', `Bearer ${token}`);
      expect(pauseRes.status).toBe(200);
      expect(pauseRes.body.paused).toBe(true);
      const resumeRes = await request(app).post('/api/timer/start').set('Authorization', `Bearer ${token}`).send({ type: 'work' });
      expect(resumeRes.status).toBe(201);
      expect(resumeRes.body.paused).toBe(false);
      const stopRes = await request(app).post('/api/timer/stop').set('Authorization', `Bearer ${token}`);
      expect(stopRes.status).toBe(200);
      expect(stopRes.body.endTime).not.toBeNull();
      const activeRes = await request(app).get('/api/timer/active').set('Authorization', `Bearer ${token}`);
      expect(activeRes.body).toBeNull();
    });
  });
});
