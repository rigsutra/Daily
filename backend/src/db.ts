import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')

const adapter = new PrismaBetterSqlite3({ url: dbPath })
export const prisma = new PrismaClient({ adapter } as any)
