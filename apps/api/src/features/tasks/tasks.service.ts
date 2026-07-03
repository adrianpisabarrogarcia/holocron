import type { AuthenticatedUser, TaskSummary } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  requireProjectAccess,
  sendError,
  uploadsDir,
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
        isBlocked: true,
        blockedReason: true,
        sprintId: true,
        owners: {
          select: { id: true, name: true, email: true }
        },
        assignees: {
          select: { id: true, name: true, email: true }
        }
      },
    });

    return tasks.map((task) => ({
      ...task,
      status: task.status,
      priority: task.priority as TaskSummary['priority'],
      isBlocked: task.isBlocked,
      blockedReason: task.blockedReason,
      owners: task.owners,
      assignees: task.assignees,
      sprintId: task.sprintId,
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

    const { title, description, status, priority, isBlocked, blockedReason, ownerIds, assigneeIds, sprintId } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      isBlocked?: boolean;
      blockedReason?: string | null;
      ownerIds?: string[];
      assigneeIds?: string[];
      sprintId?: string | null;
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
        isBlocked: isBlocked ?? false,
        blockedReason: blockedReason ?? null,
        sprintId: sprintId ?? null,
        owners: {
          connect: (ownerIds ?? []).map(id => ({ id }))
        },
        assignees: {
          connect: (assigneeIds ?? []).map(id => ({ id }))
        }
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        isBlocked: true,
        blockedReason: true,
        sprintId: true,
        owners: {
          select: { id: true, name: true, email: true }
        },
        assignees: {
          select: { id: true, name: true, email: true }
        }
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
      status: task.status,
      priority: task.priority as TaskSummary['priority'],
      isBlocked: task.isBlocked,
      blockedReason: task.blockedReason,
      owners: task.owners,
      assignees: task.assignees,
      sprintId: task.sprintId,
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

    const { title, description, status, priority, isBlocked, blockedReason, ownerIds, assigneeIds, sprintId } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      isBlocked?: boolean;
      blockedReason?: string | null;
      ownerIds?: string[];
      assigneeIds?: string[];
      sprintId?: string | null;
    };

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    });

    if (!existingTask) {
      return sendError(reply, 404, 'NOT_FOUND', 'Task not found');
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title;
    if (description !== undefined) dataToUpdate.description = description;
    if (status !== undefined) dataToUpdate.status = status;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (isBlocked !== undefined) dataToUpdate.isBlocked = isBlocked;
    if (blockedReason !== undefined) dataToUpdate.blockedReason = blockedReason;
    if (sprintId !== undefined) dataToUpdate.sprintId = sprintId;
    if (ownerIds !== undefined) {
      dataToUpdate.owners = {
        set: ownerIds.map(id => ({ id }))
      };
    }
    if (assigneeIds !== undefined) {
      dataToUpdate.assignees = {
        set: assigneeIds.map(id => ({ id }))
      };
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: dataToUpdate,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        isBlocked: true,
        blockedReason: true,
        sprintId: true,
        owners: {
          select: { id: true, name: true, email: true }
        },
        assignees: {
          select: { id: true, name: true, email: true }
        }
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
      status: updatedTask.status,
      priority: updatedTask.priority as TaskSummary['priority'],
      isBlocked: updatedTask.isBlocked,
      blockedReason: updatedTask.blockedReason,
      owners: updatedTask.owners,
      assignees: updatedTask.assignees,
      sprintId: updatedTask.sprintId,
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

  async uploadFile(request: FastifyRequest, reply: FastifyReply) {
    const { filename, base64Data } = (request.body ?? {}) as {
      filename?: string;
      base64Data?: string;
    };

    if (!base64Data) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'base64Data is required');
    }

    try {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      let buffer: Buffer;
      let fileExt = '.bin';

      if (match) {
        const mimeType = match[1];
        const data = match[2];
        buffer = Buffer.from(data, 'base64');
        if (mimeType.includes('webp')) fileExt = '.webp';
        else if (mimeType.includes('png')) fileExt = '.png';
        else if (mimeType.includes('jpeg')) fileExt = '.jpg';
        else if (mimeType.includes('pdf')) fileExt = '.pdf';
        else if (mimeType.includes('svg')) fileExt = '.svg';
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }

      if (filename) {
        const originalExt = extname(filename);
        if (originalExt) fileExt = originalExt;
      }

      const randomName = `${randomBytes(16).toString('hex')}${fileExt}`;
      const filePath = join(uploadsDir, randomName);
      writeFileSync(filePath, buffer);

      return {
        url: `/uploads/${randomName}`,
        filename: filename || randomName,
      };
    } catch (error) {
      return sendError(reply, 500, 'UPLOAD_ERROR', error instanceof Error ? error.message : 'Failed to write file');
    }
  }
  async deleteUpload(request: FastifyRequest, reply: FastifyReply) {
    const { filename } = request.params as { filename: string };

    // Security: prevent path traversal
    if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid filename');
    }

    const filePath = join(uploadsDir, filename);
    if (!existsSync(filePath)) {
      // Already gone — treat as success
      return reply.status(204).send();
    }

    try {
      unlinkSync(filePath);
      return reply.status(204).send();
    } catch (error) {
      return sendError(reply, 500, 'DELETE_ERROR', error instanceof Error ? error.message : 'Failed to delete file');
    }
  }
}
