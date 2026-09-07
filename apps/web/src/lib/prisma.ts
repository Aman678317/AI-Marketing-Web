import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient | null };

/**
 * Lazy, fail-safe Prisma client.
 * Returns null when the client cannot be created (e.g. `prisma generate`
 * not run yet, or DATABASE_URL missing) so API routes can degrade
 * gracefully instead of crashing with an empty 500.
 */
export function getPrisma(): PrismaClient | null {
  if (globalForPrisma.prisma !== undefined) {
    return globalForPrisma.prisma;
  }
  try {
    globalForPrisma.prisma = new PrismaClient({
      log: ['error', 'warn'],
    });
  } catch (err) {
    console.error('[prisma] client init failed, running without DB:', err);
    globalForPrisma.prisma = null;
  }
  return globalForPrisma.prisma;
}

/** Run a DB operation; returns fallback if DB is unavailable. */
export async function withDb<T>(op: (db: PrismaClient) => Promise<T>, fallback: T): Promise<T> {
  const db = getPrisma();
  if (!db) return fallback;
  try {
    return await op(db);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientInitializationError) {
      // Engine couldn't start yet (env missing, DB down). Drop the cached
      // client so the next request builds a fresh one — Next dev reloads
      // .env files automatically, so recovery needs no server restart.
      console.error('[prisma] client not ready (env/DB unavailable) — will retry on next request');
      globalForPrisma.prisma = undefined;
    } else {
      console.error('[prisma] query failed, degrading gracefully:', err);
    }
    return fallback;
  }
}
