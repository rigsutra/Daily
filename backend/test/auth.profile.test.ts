import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

const app = express();
app.use(express.json());

function getUserId(req: any): number {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');
  return (jwt.verify(token, JWT_SECRET) as any).userId;
}

// Auth routes — mirrors authController + authService logic
app.post('/api/auth/register', async (req: any, res: any) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, password: hashed } });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

app.get('/api/auth/profile', async (req: any, res: any) => {
  try {
    const userId = getUserId(req);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email, createdAt: user.createdAt });
  } catch (e: any) {
    res.status(401).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth API — Registration, Login, Profile', () => {
  // ── Registration ──────────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns token + user object', async () => {
      const email = `reg-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Alice', email, password: 'pass1234' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(email);
      expect(res.body.user.name).toBe('Alice');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('token is a valid JWT containing userId', async () => {
      const email = `reg-jwt-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Bob', email, password: 'pass1234' });

      const decoded: any = jwt.verify(res.body.token, JWT_SECRET);
      expect(decoded.userId).toBe(res.body.user.id);
    });

    it('rejects missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: `no-name-${Date.now()}@example.com`, password: 'pass1234' });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('rejects missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Charlie', password: 'pass1234' });

      expect(res.status).toBe(400);
    });

    it('rejects missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Dave', email: `no-pass-${Date.now()}@example.com` });

      expect(res.status).toBe(400);
    });

    it('rejects duplicate email', async () => {
      const email = `dup-${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Eve', email, password: 'pass1234' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Eve 2', email, password: 'pass5678' });

      expect(res.status).toBe(400);
    });

    it('password is hashed in the database', async () => {
      const email = `hash-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Frank', email, password: 'plaintext' });

      const stored = await prisma.user.findUnique({ where: { email } });
      expect(stored?.password).not.toBe('plaintext');
      const valid = await bcrypt.compare('plaintext', stored!.password);
      expect(valid).toBe(true);
    });
  });

  // ── Login ─────────────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    let loginEmail: string;

    beforeAll(async () => {
      loginEmail = `login-${Date.now()}@example.com`;
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Grace', email: loginEmail, password: 'correctpass' });
    });

    it('logs in with correct credentials and returns token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'correctpass' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe(loginEmail);
    });

    it('token is verifiable with JWT_SECRET', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'correctpass' });

      expect(() => jwt.verify(res.body.token, JWT_SECRET)).not.toThrow();
    });

    it('rejects wrong password with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'wrongpass' });

      expect(res.status).toBe(401);
    });

    it('rejects non-existent email with 401', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `nobody-${Date.now()}@example.com`, password: 'pass' });

      expect(res.status).toBe(401);
    });
  });

  // ── Profile ───────────────────────────────────────────────────────────────

  describe('GET /api/auth/profile', () => {
    let token: string;
    let userId: number;
    let userEmail: string;

    beforeAll(async () => {
      userEmail = `profile-${Date.now()}@example.com`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Helen', email: userEmail, password: 'pass1234' });
      token = res.body.token;
      userId = res.body.user.id;
    });

    it('returns user profile with id, name, email, createdAt', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

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
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer not.a.real.token');
      expect(res.status).toBe(401);
    });

    it('rejects request with expired token', async () => {
      const expiredToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '0s' });
      // Small delay to ensure expiry
      await new Promise(r => setTimeout(r, 10));
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(res.status).toBe(401);
    });
  });
});
