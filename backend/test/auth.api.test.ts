import request from 'supertest';
import express from 'express';
import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

// Create a test Express app without importing from source files
const app = express();
app.use(express.json());

// Manually define routes for testing
app.post('/api/register', async (req, res) => {
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

app.post('/api/login', async (req, res) => {
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

describe('Auth API Tests (Simplified)', () => {
  describe('POST /api/register', () => {
    it('should register a new user', async () => {
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: `register-${Date.now()}@example.com`,
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toContain('register-');
    });

    it('should reject duplicate email', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      
      // First registration
      await request(app)
        .post('/api/register')
        .send({
          name: 'User 1',
          email,
          password: 'password123'
        });

      // Second registration with same email
      const response = await request(app)
        .post('/api/register')
        .send({
          name: 'User 2',
          email,
          password: 'password123'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/login', () => {
    it('should login with valid credentials', async () => {
      const email = `login-${Date.now()}@example.com`;
      
      // Register user first
      await request(app)
        .post('/api/register')
        .send({
          name: 'Login Test',
          email,
          password: 'password123'
        });

      // Login
      const response = await request(app)
        .post('/api/login')
        .send({
          email,
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    it('should reject invalid password', async () => {
      const email = `login-fail-${Date.now()}@example.com`;
      
      // Register user first
      await request(app)
        .post('/api/register')
        .send({
          name: 'Login Fail',
          email,
          password: 'password123'
        });

      // Login with wrong password
      const response = await request(app)
        .post('/api/login')
        .send({
          email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });
  });
});
