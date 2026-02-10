import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : role;
}

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, role: true },
  });

  const updates = users
    .map((user) => ({
      id: user.id,
      currentRole: user.role,
      normalizedRole: normalizeRole(user.role),
    }))
    .filter((entry) => entry.currentRole !== entry.normalizedRole);

  for (const entry of updates) {
    await prisma.user.update({
      where: { id: entry.id },
      data: { role: entry.normalizedRole },
    });
  }

  console.log(`✓ Normalized ${updates.length} user role(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
