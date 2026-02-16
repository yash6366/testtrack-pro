/**
 * Utility Script: Create Admin & Test Users
 * 
 * Creates initial test users (admin, developer, tester) and general channel
 * 
 * Usage:
 *   cd apps/api
 *   node ../../scripts/dev/create-admin.js
 * 
 * Credentials:
 *   Admin: admin@gmail.com / Admin@123
 *   Developer: dev@test.com / test123
 *   Tester: tester@test.com / test123
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hashed = await bcrypt.hash('Admin@123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      name: 'System Administrator',
      password: hashed,
      role: 'ADMIN',
      isVerified: true,
    },
    create: {
      name: 'System Administrator',
      email: 'admin@gmail.com',
      password: hashed,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('✓ Admin user created:', admin.email);

  // Create a test developer
  const devHashed = await bcrypt.hash('test123', 10);
  const developer = await prisma.user.upsert({
    where: { email: 'dev@test.com' },
    update: {
      name: 'Test Developer',
      password: devHashed,
      role: 'DEVELOPER',
      isVerified: true,
    },
    create: {
      name: 'Test Developer',
      email: 'dev@test.com',
      password: devHashed,
      role: 'DEVELOPER',
      isVerified: true,
    },
  });

  console.log('✓ Developer user created:', developer.email);

  // Create a test tester
  const testerHashed = await bcrypt.hash('test123', 10);
  const tester = await prisma.user.upsert({
    where: { email: 'tester@test.com' },
    update: {
      name: 'Test Tester',
      password: testerHashed,
      role: 'TESTER',
      isVerified: true,
    },
    create: {
      name: 'Test Tester',
      email: 'tester@test.com',
      password: testerHashed,
      role: 'TESTER',
      isVerified: true,
    },
  });

  console.log('✓ Tester user created:', tester.email);

  // Create General channel with all users
  const generalChannel = await prisma.channel.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'General',
      members: {
        create: [
          { userId: admin.id },
          { userId: developer.id },
          { userId: tester.id },
        ],
      },
    },
  });

  console.log('✓ General channel created');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
