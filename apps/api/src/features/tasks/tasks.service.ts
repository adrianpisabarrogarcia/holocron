import type { AuthenticatedUser, TaskSummary } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  requireProjectAccess,
  sendError,
} from '../../shared';

export class TasksService {
  async listTasks(request: FastifyRequest, reply: FastifyReply): Promise<TaskSummary[] | void> {
    const { projectId } = request.params as { projectId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) {
      return;
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
      },
    });

    return tasks.map((task) => ({
      ...task,
      status: task.status as TaskSummary['status'],
      priority: task.priority as TaskSummary['priority'],
    }));
  }

  async createTask(request: FastifyRequest, reply: FastifyReply): Promise<TaskSummary | void> {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER' && access.membershipRole !== 'CONTRIBUTOR') {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { title, description, status, priority } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
    };

    if (!title) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Task title is required');
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status ?? 'TODO',
        priority: priority ?? 'MEDIUM',
        projectId,
        createdById: authUser.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
      },
    });

    await prisma.taskStateHistory.create({
      data: {
        taskId: task.id,
        toStatus: task.status,
        changedById: authUser.id,
        note: 'Task created',
      },
    });

    reply.code(201);
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status as TaskSummary['status'],
      priority: task.priority as TaskSummary['priority'],
    };
  }

  async updateTask(request: FastifyRequest, reply: FastifyReply): Promise<TaskSummary | void> {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER' && access.membershipRole !== 'CONTRIBUTOR') {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { title, description, status, priority } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
    };

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });

    if (!existingTask) {
      return sendError(reply, 404, 'NOT_FOUND', 'Task not found');
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title ?? undefined,
        description: description ?? undefined,
        status: status ?? undefined,
        priority: priority ?? undefined,
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
      },
    });

    if (status && status !== existingTask.status) {
      await prisma.taskStateHistory.create({
        data: {
          taskId: updatedTask.id,
          fromStatus: existingTask.status,
          toStatus: updatedTask.status,
          changedById: authUser.id,
          note: 'Task status updated',
        },
      });
    }

    return {
      id: updatedTask.id,
      title: updatedTask.title,
      description: updatedTask.description,
      status: updatedTask.status as TaskSummary['status'],
      priority: updatedTask.priority as TaskSummary['priority'],
    };
  }

  async deleteTask(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER' && access.membershipRole !== 'CONTRIBUTOR') {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });

    if (!task) {
      return sendError(reply, 404, 'NOT_FOUND', 'Task not found');
    }

    await prisma.$transaction([
      prisma.taskStateHistory.deleteMany({
        where: { taskId },
      }),
      prisma.task.delete({
        where: { id: taskId },
      }),
    ]);

    return { success: true };
  }
}
