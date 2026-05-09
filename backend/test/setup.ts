import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

// Set test environment variables
const TEST_DATABASE_URL = 'file:./prisma/test.db';
const JWT_SECRET = 'test-jwt-secret-key';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.JWT_SECRET = JWT_SECRET;

// Initialize Prisma with test database
const adapter = new PrismaBetterSqlite3({ url: TEST_DATABASE_URL });
const prisma = new PrismaClient({ adapter } as any);

// Setup before all tests - create the test database schema
beforeAll(async () => {
  try {
    console.log('Setting up test database...');
    
    const backendDir = 'C:/projects/Daily/backend';
    const configPath = path.join(backendDir, 'prisma.config.ts');
    const configBackupPath = path.join(backendDir, 'prisma.config.backup.ts');
    
    // Backup original config
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, configBackupPath);
    }
    
    // Create test config pointing to test.db
    const testConfig = `import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: '${TEST_DATABASE_URL}',
  },
})
`;
    fs.writeFileSync(configPath, testConfig);
    
    // Remove existing test database
    const testDbPath = path.join(backendDir, 'prisma', 'test.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    // Push schema to test database
    try {
      execSync('npx prisma db push --force-reset', {
        cwd: backendDir,
        stdio: 'inherit'
      });
    } finally {
      // Restore original config
      if (fs.existsSync(configBackupPath)) {
        fs.copyFileSync(configBackupPath, configPath);
        fs.unlinkSync(configBackupPath);
      }
    }
    
    console.log('✅ Test database ready');
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    throw error;
  }
}, 30000);

// No afterEach cleanup - each test creates its own data

// Cleanup after all tests
afterAll(async () => {
  try {
    await prisma.$disconnect();
    console.log('✅ Test database disconnected');
  } catch (error) {
    console.error('❌ Test cleanup failed:', error);
  }
});

// Helper to create a test user
export async function createTestUser(emailPrefix: string = 'test') {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: `${emailPrefix}-${Date.now()}-${Math.random()}@example.com`,
      password: hashedPassword
    }
  });
  return user;
}

// Export for use in tests
export { prisma, bcrypt, jwt, JWT_SECRET };
