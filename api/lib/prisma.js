let prisma;

try {
  const { PrismaClient } = require('@prisma/client');
  
  // Singleton pattern for Prisma Client
  if (process.env.NODE_ENV === 'production') {
    // In production (like Vercel), initialize with error handling
    prisma = new PrismaClient({
      log: ['error'],
      errorFormat: 'minimal',
    });
  } else {
    // In development, store the client on global to prevent multiple instances
    if (!global.__prisma) {
      global.__prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
    }
    prisma = global.__prisma;
  }
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error.message);
  console.error('Make sure to run "prisma generate" first');
  throw new Error('Prisma Client not available. Please run "prisma generate".');
}

module.exports = prisma;