import { getPrismaClient } from '../lib/prisma.js';

const DEFAULT_UNIVERSAL_CHANNEL_NAME = 'Univarsal Channel';

function getUniversalChannelName() {
  return process.env.UNIVERSAL_CHANNEL_NAME || DEFAULT_UNIVERSAL_CHANNEL_NAME;
}

export async function ensureUniversalChannel() {
  const prisma = getPrismaClient();
  const name = getUniversalChannelName();

  const existing = await prisma.channel.findFirst({
    where: {
      name,
      type: 'CHANNEL',
    },
    select: { id: true, name: true, type: true },
  });

  if (existing) {
    return existing;
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      type: 'CHANNEL',
      createdById: null,
    },
    select: { id: true, name: true, type: true },
  });

  return channel;
}

export async function ensureUserInUniversalChannel(userId) {
  const prisma = getPrismaClient();
  const channel = await ensureUniversalChannel();

  const existing = await prisma.channelMember.findUnique({
    where: {
      channelId_userId: {
        channelId: channel.id,
        userId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return channel;
  }

  await prisma.channelMember.create({
    data: {
      channelId: channel.id,
      userId,
    },
  });

  return channel;
}

export async function ensureAllUsersInUniversalChannel() {
  const prisma = getPrismaClient();
  const channel = await ensureUniversalChannel();

  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    return channel;
  }

  const members = await prisma.channelMember.findMany({
    where: { channelId: channel.id },
    select: { userId: true },
  });

  const memberSet = new Set(members.map((member) => member.userId));
  const missing = users
    .filter((user) => !memberSet.has(user.id))
    .map((user) => ({ channelId: channel.id, userId: user.id }));

  if (missing.length > 0) {
    await prisma.channelMember.createMany({
      data: missing,
      skipDuplicates: true,
    });
  }

  return channel;
}
