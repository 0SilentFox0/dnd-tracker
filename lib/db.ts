import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Для Transaction mode (порт 6543) вимикаємо prepared statements
    // Prisma автоматично визначає це, але можна явно вказати
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
