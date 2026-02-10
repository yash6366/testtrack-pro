import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleRuns = [
  {
    name: 'Login Feature Test',
    status: 'Passed',
    passRate: 100,
    executedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
  },
  {
    name: 'Email Verification Test',
    status: 'Passed',
    passRate: 95,
    executedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
  {
    name: 'Dashboard Navigation Test',
    status: 'In Progress',
    passRate: 70,
    executedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
  },
  {
    name: 'Session Timeout Test',
    status: 'Failed',
    passRate: 40,
    executedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
  },
];

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true },
  });

  let generalChannel = await prisma.channel.findFirst({
    where: { name: 'General', type: 'CHANNEL' },
  });

  if (!generalChannel) {
    generalChannel = await prisma.channel.create({
      data: {
        name: 'General',
        type: 'CHANNEL',
        createdById: users[0]?.id ?? null,
      },
    });
  }

  if (users.length > 0) {
    await prisma.channelMember.createMany({
      data: users.map((user) => ({
        channelId: generalChannel.id,
        userId: user.id,
      })),
      skipDuplicates: true,
    });
  }

  const messageCount = await prisma.message.count({
    where: { channelId: generalChannel.id },
  });

  if (messageCount === 0 && users[0]) {
    await prisma.message.create({
      data: {
        channelId: generalChannel.id,
        senderId: users[0].id,
        body: 'Welcome to TestTrack Pro chat!',
      },
    });
  }

  if (users.length >= 2) {
    const existingDirect = await prisma.channel.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: users[0].id } } },
          { members: { some: { userId: users[1].id } } },
        ],
      },
    });

    if (!existingDirect) {
      await prisma.channel.create({
        data: {
          type: 'DIRECT',
          createdById: users[0].id,
          members: {
            create: [{ userId: users[0].id }, { userId: users[1].id }],
          },
        },
      });
    }
  }

  for (const user of users) {
    const existing = await prisma.legacyTestRun.count({ where: { userId: user.id } });
    if (existing > 0) {
      continue;
    }

    await prisma.legacyTestRun.createMany({
      data: sampleRuns.map((run) => ({
        ...run,
        userId: user.id,
      })),
    });
  }

  const count = await prisma.legacyTestRun.count();
  console.log(`Seeded test runs. Total: ${count}`);

  // Seed general channel
  const channelExists = await prisma.channel.findFirst({ where: { name: 'General' } });
  if (!channelExists && users.length > 0) {
    await prisma.channel.create({
      data: {
        name: 'General',
        type: 'CHANNEL',
        createdById: users[0].id,
        members: {
          create: users.map((user) => ({ userId: user.id })),
        },
      },
    });
    console.log('Seeded General channel');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
