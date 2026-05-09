import { prisma, bcrypt } from './setup';

describe('Mobile Usage Service Tests', () => {
  const testDeviceId = 'test-device-123';
  let testUserId: number;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        name: 'Mobile Test User',
        email: `mobile-test-${Date.now()}@example.com`,
        password: hashedPassword
      }
    });
    testUserId = user.id;
  });

  describe('Create Mobile Usage', () => {
    it('should create mobile usage entry', async () => {
      const usage = await prisma.mobileUsage.create({
        data: {
          deviceId: testDeviceId,
          appName: 'Chrome',
          packageName: 'com.android.chrome',
          minutesUsed: 120,
          category: 'Productivity',
          date: new Date()
        }
      });

      expect(usage.id).toBeDefined();
      expect(usage.deviceId).toBe(testDeviceId);
      expect(usage.appName).toBe('Chrome');
      expect(usage.minutesUsed).toBe(120);
    });

    it('should enforce unique usage per day per app', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create first entry
      await prisma.mobileUsage.create({
        data: {
          deviceId: testDeviceId,
          appName: 'Instagram',
          packageName: 'com.instagram.android',
          minutesUsed: 60,
          category: 'Social',
          date: today
        }
      }).catch(() => {});

      // Try to create duplicate - should fail
      await expect(
        prisma.mobileUsage.create({
          data: {
            deviceId: testDeviceId,
            appName: 'Instagram',
            packageName: 'com.instagram.android',
            minutesUsed: 90,
            category: 'Social',
            date: today
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Get Mobile Usage', () => {
    it('should get usage by device', async () => {
      const usage = await prisma.mobileUsage.findMany({
        where: { deviceId: testDeviceId }
      });

      expect(Array.isArray(usage)).toBe(true);
      usage.forEach(entry => {
        expect(entry.deviceId).toBe(testDeviceId);
      });
    });

    it('should filter by date', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usage = await prisma.mobileUsage.findMany({
        where: {
          deviceId: testDeviceId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      expect(Array.isArray(usage)).toBe(true);
    });

    it('should filter by app name', async () => {
      const usage = await prisma.mobileUsage.findMany({
        where: {
          appName: 'Chrome'
        }
      });

      expect(Array.isArray(usage)).toBe(true);
    });
  });

  describe('Update Mobile Usage', () => {
    let usageId: number;

    beforeEach(async () => {
      const usage = await prisma.mobileUsage.create({
        data: {
          deviceId: testDeviceId,
          appName: 'Update Test App',
          packageName: 'com.test.update',
          minutesUsed: 30,
          category: 'Test',
          date: new Date()
        }
      });
      usageId = usage.id;
    });

    it('should update minutes used', async () => {
      const updated = await prisma.mobileUsage.update({
        where: { id: usageId },
        data: { minutesUsed: 60 }
      });

      expect(updated.minutesUsed).toBe(60);
    });

    it('should update category', async () => {
      const updated = await prisma.mobileUsage.update({
        where: { id: usageId },
        data: { category: 'Updated Category' }
      });

      expect(updated.category).toBe('Updated Category');
    });
  });

  describe('Delete Mobile Usage', () => {
    it('should delete mobile usage entry', async () => {
      const usage = await prisma.mobileUsage.create({
        data: {
          deviceId: testDeviceId,
          appName: 'Delete Test',
          packageName: 'com.test.delete',
          minutesUsed: 10,
          date: new Date()
        }
      });

      await prisma.mobileUsage.delete({
        where: { id: usage.id }
      });

      const deleted = await prisma.mobileUsage.findUnique({
        where: { id: usage.id }
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Aggregations', () => {
    it('should calculate total usage per day', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await prisma.mobileUsage.groupBy({
        by: ['date'],
        where: {
          deviceId: testDeviceId,
          date: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        },
        _sum: {
          minutesUsed: true
        }
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
