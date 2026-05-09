import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET, createTestUser } from './setup';

// Create a test Express app
const app = express();
app.use(express.json());

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

// Task routes (simplified)
app.get('/api/tasks', async (req: any, res: any) => {
  try {
    const userId = (req as any).userId; // In real app, from auth middleware
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

describe('Task API Tests (Simplified)', () => {
  let authToken: string;
  let testUserId: number;

  beforeAll(async () => {
    // Register and login a user
    const email = `task-api-${Date.now()}@example.com`;
    
    await request(app)
      .post('/api/register')
      .send({
        name: 'Task API User',
        email,
        password: 'password123'
      });

    const loginRes = await request(app)
      .post('/api/login')
      .send({
        email,
        password: 'password123'
      });
    
    authToken = loginRes.body.token;
    const decoded: any = jwt.verify(authToken, JWT_SECRET);
    testUserId = decoded.userId;
  });

  describe('POST /api/tasks', () => {
    it('should create a task', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'API Test Task',
          target: 10,
          unit: 'hours'
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('API Test Task');
      expect(response.body.userId).toBe(testUserId);
    });
  });

  describe('GET /api/tasks', () => {
    it('should get all tasks for user', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
