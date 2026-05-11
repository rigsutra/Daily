import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

const app = express();
app.use(express.json());

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed } });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.get('/api/auth/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

describe('Auth Profile API', () => {
  let token: string;
  let userId: number;
  let userEmail: string;

  beforeAll(async () => {
    userEmail = `profile-${Date.now()}@example.com`;
    const res = await request(app).post('/api/auth/register').send({ name: 'Helen', email: userEmail, password: 'pass1234' });
    token = res.body.token;
    userId = res.body.user.id;
  });

  it('returns user profile with id, name, email, createdAt', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(userEmail);
    expect(res.body.name).toBe('Helen');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).not.toHaveProperty('password');
  });

  it('rejects request without token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.status).toBe(401);
  });

  it('rejects request with invalid token', async () => {
    const res = await request(app).get('/api/auth/profile').set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });
});
