import { PrismaClient } from '@prisma/client';

let prisma;
let connectionAttempt = null;

function createPrismaClient() {
  const baseClient = new PrismaClient({
    errorFormat: 'pretty',
    log: ['error', 'warn'],
  });

  return baseClient;
}

export function getPrismaClient() {
  if (!prisma) {
    prisma = createPrismaClient();
    if (!connectionAttempt) {
      connectionAttempt = prisma.$connect().catch((err) => {
        console.error('Prisma connection failed:', err);
        throw err;
      });
    }
  }
  return prisma;
}

export async function ensurePrismaConnected() {
  getPrismaClient();
  if (connectionAttempt) {
    await connectionAttempt;
  }
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

export function systemQueryRaw(strings, ...values) {
  const client = getPrismaClient();
  return client.$queryRaw(strings, ...values);
}
