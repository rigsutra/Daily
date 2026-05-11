import { prisma, bcrypt } from './setup';

describe('Timer Service Tests', () => {
  let testUserId: number;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: { name: 'Timer Test User', email: `timer-test-${Date.now()}@example.com`, password: hashedPassword }
    });
    testUserId = user.id;
  });

  describe('Create Timer Session', () => {
    it('should create a timer session', async () => {
      const session = await prisma.timerSession.create({
        data: { userId: testUserId, type: 'work', startTime: new Date(), paused: false }
      });
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.type).toBe('work');
      expect(session.endTime).toBeNull();
      expect(session.paused).toBe(false);
    });

    it('should create timer with different types', async () => {
      const types = ['work', 'study', 'break'];
      for (const type of types) {
        const session = await prisma.timerSession.create({
          data: { userId: testUserId, type, startTime: new Date(), paused: false }
        });
        expect(session.type).toBe(type);
      }
    });
  });

  describe('Get Timer Sessions', () => {
    it('should get all sessions for user', async () => {
      const sessions = await prisma.timerSession.findMany({ where: { userId: testUserId } });
      expect(Array.isArray(sessions)).toBe(true);
      sessions.forEach(session => expect(session.userId).toBe(testUserId));
    });

    it('should filter sessions by date', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessions = await prisma.timerSession.findMany({
        where: { userId: testUserId, startTime: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) } }
      });
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should get active session (no endTime)', async () => {
      await prisma.timerSession.create({
        data: { userId: testUserId, type: 'work', startTime: new Date(), paused: false }
      });
      const activeSession = await prisma.timerSession.findFirst({
        where: { userId: testUserId, endTime: null }
      });
      expect(activeSession).not.toBeNull();
      expect(activeSession?.endTime).toBeNull();
    });
  });

  describe('Update Timer Session', () => {
    let sessionId: number;

    beforeEach(async () => {
      const session = await prisma.timerSession.create({
        data: { userId: testUserId, type: 'work', startTime: new Date(Date.now() - 3600000), paused: false }
      });
      sessionId = session.id;
    });

    it('should stop timer (set endTime and duration)', async () => {
      const endTime = new Date();
      const duration = 3600;
      const updated = await prisma.timerSession.update({
        where: { id: sessionId },
        data: { endTime, duration }
      });
      expect(updated.endTime).not.toBeNull();
      expect(updated.duration).toBe(duration);
    });

    it('should pause timer', async () => {
      const updated = await prisma.timerSession.update({
        where: { id: sessionId },
        data: { paused: true }
      });
      expect(updated.paused).toBe(true);
    });
  });

  describe('Delete Timer Session', () => {
    it('should delete timer session', async () => {
      const session = await prisma.timerSession.create({
        data: { userId: testUserId, type: 'work', startTime: new Date(), paused: false }
      });
      await prisma.timerSession.delete({ where: { id: session.id } });
      const deleted = await prisma.timerSession.findUnique({ where: { id: session.id } });
      expect(deleted).toBeNull();
    });
  });
});
