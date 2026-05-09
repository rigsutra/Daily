import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key';

// Generate test JWT token
export function generateTestToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

// Hash password for tests
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Test user data
export const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Test task data
export const testTask = {
  title: 'Test Task',
  target: 10,
  unit: 'hours',
  mandatory: true
};

// Test goal data
export const testGoal = {
  title: 'Test Goal',
  period: 'daily',
  targetHours: 8,
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
};

// Test timer session data
export const testTimerSession = {
  type: 'work',
  startTime: new Date(),
  paused: false
};

// Test daily entry data
export const testDailyEntry = {
  date: new Date(),
  workHours: 8,
  studyHours: 2,
  gymCompleted: true,
  waterLiters: 3,
  sleepHours: 7,
  productiveHours: 6
};
