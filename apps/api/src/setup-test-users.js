import bcrypt from 'bcryptjs';
import { getPrismaClient } from './lib/prisma.js';

const prisma = getPrismaClient();

async function main() {
  try {
    console.log('Creating test users...');

    // Create admin user
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@gmail.com' },
      update: {
        name: 'System Administrator',
        password: adminHash,
        role: 'ADMIN',
        isVerified: true,
      },
      create: {
        name: 'System Administrator',
        email: 'admin@gmail.com',
        password: adminHash,
        role: 'ADMIN',
        isVerified: true,
      },
    });
    console.log('✓ Admin user:', admin.email);

    // Create developer user
    const devHash = await bcrypt.hash('test123', 10);
    const developer = await prisma.user.upsert({
      where: { email: 'dev@test.com' },
      update: {
        name: 'Test Developer',
        password: devHash,
        role: 'DEVELOPER',
        isVerified: true,
      },
      create: {
        name: 'Test Developer',
        email: 'dev@test.com',
        password: devHash,
        role: 'DEVELOPER',
        isVerified: true,
      },
    });
    console.log('✓ Developer user:', developer.email);

    // Create tester user
    const testerHash = await bcrypt.hash('test123', 10);
    const tester = await prisma.user.upsert({
      where: { email: 'tester@test.com' },
      update: {
        name: 'Test Tester',
        password: testerHash,
        role: 'TESTER',
        isVerified: true,
      },
      create: {
        name: 'Test Tester',
        email: 'tester@test.com',
        password: testerHash,
        role: 'TESTER',
        isVerified: true,
      },
    });
    console.log('✓ Tester user:', tester.email);

    console.log('\n✅ All test users created successfully!');
    console.log('\nLogin credentials:');
    console.log('  Admin:     admin@gmail.com / Admin@123');
    console.log('  Developer: dev@test.com / test123');
    console.log('  Tester:    tester@test.com / test123');
  } catch (error) {
    console.error('❌ Error creating users:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
