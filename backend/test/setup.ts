import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');

const TEST_DATABASE_URL = 'file:./prisma/test.db';
const JWT_SECRET = 'test-jwt-secret-key';

process.env.JWT_SECRET = JWT_SECRET;

// Initialize Prisma with test database
const adapter = new PrismaBetterSqlite3({ url: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Setup before all tests — reset the test DB schema via prisma db push
beforeAll(async () => {
  try {
    console.log('Setting up test database...');

    const testDbPath = path.join(backendDir, 'prisma', 'test.db');

    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // prisma.config.ts now reads DATABASE_URL, so pass it in the child env.
    // No file modification needed — safe for parallel jest workers.
    execSync('npx prisma db push --force-reset', {
      cwd: backendDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: TEST_DATABASE_URL,
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
      },
    });

    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
}, 30000);

afterAll(async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

export async function createTestUser(emailPrefix: string = 'test') {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: `${emailPrefix}-${Date.now()}-${Math.random()}@example.com`,
      password: hashedPassword,
    },
  });
  return user;
}

export { prisma, bcrypt, jwt, JWT_SECRET };
