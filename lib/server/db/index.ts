import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  const pool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000, // Bounded connection timeout (5s) prevents indefinite request hangs
    idleTimeoutMillis: 30000,
    max: 10,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // Attach error handler to idle clients to prevent unhandled socket drop errors from crashing process
  pool.on('error', (err) => {
    console.error('[pg.Pool] Unexpected error on idle database client:', err?.message || err);
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from './resilience';
export default prisma;
