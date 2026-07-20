import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForAuthPrisma = globalThis as unknown as { authPrisma: PrismaClient }

function createAuthPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter } as any)
}

export const authPrisma = globalForAuthPrisma.authPrisma ?? createAuthPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForAuthPrisma.authPrisma = authPrisma