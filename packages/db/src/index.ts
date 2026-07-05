import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL ?? 'adrian.pisabarro.garcia@gmail.com';
const initialAdminName = process.env.INITIAL_ADMIN_NAME ?? 'Adrián Pisabarro';
const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD ?? 'ChangeMe123!';
const demoProjectName = 'Outer Rim Recovery';

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');

  return `scrypt$${salt}$${derivedKey}`;
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function ensureSeedData() {
  const admin = await prisma.user.upsert({
    where: { email: initialAdminEmail },
    update: {
      name: initialAdminName,
      passwordHash: hashPassword(initialAdminPassword),
      platformRole: 'ADMIN',
      isActive: true,
    },
    create: {
      email: initialAdminEmail,
      name: initialAdminName,
      passwordHash: hashPassword(initialAdminPassword),
      platformRole: 'ADMIN',
      isActive: true,
    },
  });

  const existingDemoProject = await prisma.project.findFirst({
    where: {
      name: demoProjectName,
      ownerId: admin.id,
    },
    select: {
      id: true,
    },
  });

  if (existingDemoProject) {
    await prisma.projectMembership.upsert({
      where: {
        projectId_userId: {
          projectId: existingDemoProject.id,
          userId: admin.id,
        },
      },
      update: {
        role: 'MANAGER',
      },
      create: {
        projectId: existingDemoProject.id,
        userId: admin.id,
        role: 'MANAGER',
      },
    });
  }

  const projectCount = await prisma.project.count();

  if (projectCount > 0) {
    return;
  }

  await prisma.project.create({
    data: {
      name: demoProjectName,
      description: 'Bring scattered sector intelligence back into a single command board.',
      status: 'ACTIVE',
      ownerId: admin.id,
      memberships: {
        create: {
          userId: admin.id,
          role: 'MANAGER',
        },
      },
      tasks: {
        create: [
          {
            title: 'Survey smugglers lane reports',
            description: 'Review the latest recovered manifests and flag anomalies.',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            createdById: admin.id,
          },
          {
            title: 'Secure fuel depot clearance',
            description: 'Confirm landing permits before the next convoy window closes.',
            status: 'TODO',
            priority: 'MEDIUM',
            createdById: admin.id,
          },
          {
            title: 'Debrief the scout team',
            description: 'Capture blockers from the last ice moon sweep.',
            status: 'BLOCKED',
            priority: 'URGENT',
            createdById: admin.id,
          },
        ],
      },
    },
  });
}

export * from '@prisma/client';
