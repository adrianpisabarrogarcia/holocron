import cors from '@fastify/cors';
import Fastify from 'fastify';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@holocron/db';

const port = Number(process.env.PORT ?? 3000);
const host = '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const uploadsDir = process.env.UPLOADS_DIR ?? resolve(process.cwd(), 'storage/uploads');

mkdirSync(uploadsDir, { recursive: true });

const app = Fastify({ logger: true });

async function ensureSeedData() {
  const projectCount = await prisma.project.count();

  if (projectCount > 0) {
    return;
  }

  const owner = await prisma.user.create({
    data: {
      email: 'keeper@holocron.local',
      name: 'Archivist Keeper',
    },
  });

  const project = await prisma.project.create({
    data: {
      name: 'Outer Rim Recovery',
      description: 'Bring scattered sector intelligence back into a single command board.',
      status: 'ACTIVE',
      ownerId: owner.id,
    },
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Survey smugglers lane reports',
        description: 'Review the latest recovered manifests and flag anomalies.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project.id,
        createdById: owner.id,
      },
      {
        title: 'Secure fuel depot clearance',
        description: 'Confirm landing permits before the next convoy window closes.',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: project.id,
        createdById: owner.id,
      },
      {
        title: 'Debrief the scout team',
        description: 'Capture blockers from the last ice moon sweep.',
        status: 'BLOCKED',
        priority: 'URGENT',
        projectId: project.id,
        createdById: owner.id,
      },
    ],
  });
}

await app.register(cors, {
  origin: corsOrigin,
});

app.get('/health', async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: 'ok',
  };
});

app.get('/api/projects', async () => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    taskCount: project._count.tasks,
  }));
});

app.get('/api/projects/:projectId/tasks', async (request, reply) => {
  const { projectId } = request.params as { projectId: string };

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tasks: {
        orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      },
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });

  if (!project) {
    return reply.code(404).send({ message: 'Project not found' });
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      taskCount: project._count.tasks,
    },
    tasks: project.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
    })),
  };
});

await ensureSeedData();
await app.listen({ port, host });
