import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isVerified: true,
        verificationToken: true,
        verificationTokenExpiry: true,
      },
    });

    console.log('📊 Database Users Analysis:\n');
    console.log(`Total users: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Verified: ${user.isVerified ? '✅ Yes' : '❌ No'}`);
      console.log(`  Has Token: ${user.verificationToken ? '✅ Yes' : '❌ No'}`);
      if (user.verificationToken) {
        console.log(`  Token (first 20 chars): ${user.verificationToken.substring(0, 20)}...`);
        console.log(`  Token Expiry: ${user.verificationTokenExpiry}`);
      }
      console.log('');
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();
