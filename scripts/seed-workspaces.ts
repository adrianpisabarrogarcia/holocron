/**
 * Seed script: Create the "Default" workspace and migrate all existing
 * projects, folders and users into it. Elevates the superadmin to SUPERADMIN.
 *
 * Run with:
 *   DATABASE_URL="file:./prisma/data/dev.db" ts-node seed-workspaces.ts
 * or via pnpm:
 *   pnpm --filter @holocron/db exec ts-node ../../scripts/seed-workspaces.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPERADMIN_EMAIL = 'adrian.pisabarro.garcia@gmail.com';
const DEFAULT_WORKSPACE_SLUG = 'default';
const DEFAULT_WORKSPACE_NAME = 'Holocron';

async function main() {
  console.log('🚀 Starting workspace seed migration...');

  // ─── 1. Create (or get) the Default workspace ──────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: DEFAULT_WORKSPACE_SLUG },
    update: {},
    create: {
      name: DEFAULT_WORKSPACE_NAME,
      slug: DEFAULT_WORKSPACE_SLUG,
      description: 'Workspace principal de Holocron',
      primaryColor: '#6366f1',
    },
  });
  console.log(`✅ Workspace "${workspace.name}" (${workspace.id}) ready.`);

  // ─── 2. Elevate SUPERADMIN user ────────────────────────────────────────────
  const superAdmin = await prisma.user.findUnique({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (superAdmin) {
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: {
        platformRole: 'SUPERADMIN',
        activeWorkspaceId: workspace.id,
      },
    });
    console.log(`✅ User "${SUPERADMIN_EMAIL}" elevated to SUPERADMIN.`);
  } else {
    console.warn(`⚠️  Superadmin user "${SUPERADMIN_EMAIL}" not found. Skipping elevation.`);
  }

  // ─── 3. Migrate all existing users into Default workspace ──────────────────
  const users = await prisma.user.findMany();
  let usersAdded = 0;

  for (const user of users) {
    const isSuperAdmin = user.email === SUPERADMIN_EMAIL;
    const wsRole = (isSuperAdmin || user.platformRole === 'ADMIN') ? 'WORKSPACE_ADMIN' : 'MEMBER';

    await prisma.workspaceMembership.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      },
      update: {},
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        workspaceRole: wsRole,
      },
    });

    // Set activeWorkspaceId for users that don't have one yet
    if (!user.activeWorkspaceId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeWorkspaceId: workspace.id },
      });
    }

    usersAdded++;
  }

  console.log(`✅ ${usersAdded} users migrated to workspace "${workspace.name}".`);

  // ─── 4. Migrate all existing projects into Default workspace ───────────────
  const projectsUpdated = await prisma.project.updateMany({
    where: { workspaceId: '' },
    data: { workspaceId: workspace.id },
  });

  // Also update projects that have null workspaceId via raw (SQLite doesn't support NULL in updateMany where easily)
  await prisma.$executeRaw`UPDATE "Project" SET "workspaceId" = ${workspace.id} WHERE "workspaceId" = '' OR "workspaceId" IS NULL`;

  console.log(`✅ Projects migrated (updateMany): ${projectsUpdated.count}.`);

  // ─── 5. Migrate all existing folders into Default workspace ────────────────
  await prisma.$executeRaw`UPDATE "Folder" SET "workspaceId" = ${workspace.id} WHERE "workspaceId" = '' OR "workspaceId" IS NULL`;

  console.log(`✅ Folders migrated to workspace "${workspace.name}".`);

  console.log('\n🎉 Workspace seed migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
