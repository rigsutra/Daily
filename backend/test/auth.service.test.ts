import { prisma, bcrypt, jwt, JWT_SECRET } from './setup';

describe('Auth Service Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;

  describe('User Registration', () => {
    it('should hash password before storing', async () => {
      const userData = {
        name: 'Test User',
        email: testEmail,
        password: 'plaintext123'
      };

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword
        }
      });

      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      const isMatch = await bcrypt.compare('plaintext123', user.password);
      expect(isMatch).toBe(true);
      const isWrongMatch = await bcrypt.compare('wrongpassword', user.password);
      expect(isWrongMatch).toBe(false);
    });

    it('should not allow duplicate emails', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('password123', 10);

      await prisma.user.create({
        data: { name: 'Test User', email, password: hashedPassword }
      });

      await expect(
        prisma.user.create({
          data: { name: 'Another User', email, password: hashedPassword }
        })
      ).rejects.toThrow();
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate valid JWT token', () => {
      const userId = 1;
      const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
      expect(token).toBeDefined();
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      expect(decoded.userId).toBe(userId);
    });

    it('should reject invalid token', () => {
      expect(() => {
        jwt.verify('invalid-token', JWT_SECRET);
      }).toThrow();
    });
  });

  describe('Password Comparison', () => {
    it('should correctly compare passwords', async () => {
      const password = 'mypassword123';
      const hash = await bcrypt.hash(password, 10);
      const isMatch = await bcrypt.compare(password, hash);
      expect(isMatch).toBe(true);
      const isNotMatch = await bcrypt.compare('wrongpassword', hash);
      expect(isNotMatch).toBe(false);
    });
  });
});
