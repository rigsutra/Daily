import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET, createTestUser } from './setup';

// Create a test Express app
const app = express();
app.use(express.json());

// Helper to register and login a user
async function registerAndLogin(name: string, email: string, password: string = 'password123') {
  // Register
  const regRes = await request(app)
    .post('/api/register')
    .send({ name, email, password });
  
  // Login
  const loginRes = await request(app)
    .post('/api/login')
    .send({ email, password });
  
  return {
    token: loginRes.body.token,
    userId: jwt.verify(loginRes.body.token, JWT_SECRET) as any.userId
  };
}

// Auth routes
app.post('/api/register', async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword }
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Task routes
app.get('/api/tasks', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const tasks = await prisma.task.findMany({ where: { userId } });
    res.json(tasks);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const task = await prisma.task.create({
      data: { ...req.body, userId }
    });
    res.status(201).json(task);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Timer routes
app.post('/api/timer/start', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const session = await prisma.timerSession.create({
      data: {
        userId,
        type: req.body.type || 'work',
        startTime: new Date(),
        paused: false
      }
    });
    res.status(201).json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/timer/active', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const session = await prisma.timerSession.findFirst({
      where: { userId, endTime: null }
    });
    res.json(session);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Goal routes
app.get('/api/goals', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const goals = await prisma.goal.findMany({ where: { userId } });
    res.json(goals);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/goals', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const goal = await prisma.goal.create({
      data: { ...req.body, userId, status: 'active', achievedHours: 0 }
    });
    res.status(201).json(goal);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Dashboard routes
app.get('/api/dashboard/daily', async (req: any, res: any) => {
  try {
    const userId = (jwt.verify(req.headers.authorization?.split(' ')[1], JWT_SECRET) as any).userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entry = await prisma.dailyEntry.findFirst({
      where: {
        userId,
        date: { gte: today, lt: new Date(today.getTime() + 86400000) }
      }
    });
    
    const tasks = await prisma.task.findMany({ where: { userId } });
    const sessions = await prisma.timerSession.findMany({
      where: { userId, startTime: { gte: today } }
    });
    const goals = await prisma.goal.findMany({ where: { userId, status: 'active' } });
    
    res.json({ entry, tasks, sessions, goals });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

describe('API Integration Tests', () => {
  describe('Auth API', () => {
    it('should register and login', async () => {
      const { token, userId } = await registerAndLogin(
        'API Test User',
        `api-test-${Date.now()}@example.com`
      );
      
      expect(token).toBeDefined();
      expect(userId).toBeDefined();
    });
  });

  describe('Task API', () => {
    it('should create and get tasks', async () => {
      const { token } = await registerAndLogin(
        'Task API User',
        `task-api-${Date.now()}@example.com`
      );
      
      // Create task
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'API Task', target: 10, unit: 'hours' });
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.title).toBe('API Task');
      
      // Get tasks
      const getRes = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`);
      
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
    });
  });

  describe('Timer API', () => {
    it('should start timer and get active', async () => {
      const { token } = await registerAndLogin(
        'Timer API User',
        `timer-api-${Date.now()}@example.com`
      );
      
      // Start timer
      const startRes = await request(app)
        .post('/api/timer/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'work' });
      
      expect(startRes.status).toBe(201);
      expect(startRes.body.type).toBe('work');
      
      // Get active timer
      const activeRes = await request(app)
        .get('/api/timer/active')
        .set('Authorization', `Bearer ${token}`);
      
      expect(activeRes.status).toBe(200);
      expect(activeRes.body).not.toBeNull();
    });
  });

  describe('Goal API', () => {
    it('should create and get goals', async () => {
      const { token } = await registerAndLogin(
        'Goal API User',
        `goal-api-${Date.now()}@example.com`
      );
      
      // Create goal
      const createRes = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'API Goal',
          period: 'daily',
          targetHours: 8,
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000)
        });
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.title).toBe('API Goal');
      
      // Get goals
      const getRes = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${token}`);
      
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
    });
  });

  describe('Dashboard API', () => {
    it('should get daily dashboard', async () => {
      const { token } = await registerAndLogin(
        'Dashboard API User',
        `dashboard-api-${Date.now()}@example.com`
      );
      
      const res = await request(app)
        .get('/api/dashboard/daily')
        .set('Authorization', `Bearer ${token}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entry');
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('sessions');
      expect(res.body).toHaveProperty('goals');
    });
  });
});
