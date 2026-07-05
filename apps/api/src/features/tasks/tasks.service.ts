import type { AuthenticatedUser, TaskSummary, CommentSummary } from '@holocron/contracts';
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
import { EmailService } from '../email/email.service';
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
        startDate: true,
        endDate: true,
        estimatedHours: true,
        timeSpent: true,
        timerStartedAt: true,
        owners: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        assignees: {
          select: { id: true, name: true, email: true, avatarUrl: true }
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
      startDate: task.startDate ? task.startDate.toISOString() : null,
      endDate: task.endDate ? task.endDate.toISOString() : null,
      estimatedHours: task.estimatedHours,
      timeSpent: task.timeSpent,
      timerStartedAt: task.timerStartedAt ? task.timerStartedAt.toISOString() : null,
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

    const {
      title,
      description,
      status,
      priority,
      isBlocked,
      blockedReason,
      ownerIds,
      assigneeIds,
      sprintId,
      startDate,
      endDate,
      estimatedHours,
      timeSpent,
      timerStartedAt
    } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      isBlocked?: boolean;
      blockedReason?: string | null;
      ownerIds?: string[];
      assigneeIds?: string[];
      sprintId?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      estimatedHours?: number | null;
      timeSpent?: number;
      timerStartedAt?: string | null;
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
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        estimatedHours: estimatedHours !== undefined && estimatedHours !== null ? Number(estimatedHours) : null,
        timeSpent: timeSpent !== undefined ? Number(timeSpent) : 0,
        timerStartedAt: timerStartedAt ? new Date(timerStartedAt) : null,
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
        startDate: true,
        endDate: true,
        estimatedHours: true,
        timeSpent: true,
        timerStartedAt: true,
        owners: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        assignees: {
          select: { id: true, name: true, email: true, avatarUrl: true }
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

    EmailService.sendTaskCreatedEmail(task, authUser).catch(err => {
      console.error('[EMAIL ERROR] Failed to send task created email:', err);
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
      startDate: task.startDate ? task.startDate.toISOString() : null,
      endDate: task.endDate ? task.endDate.toISOString() : null,
      estimatedHours: task.estimatedHours,
      timeSpent: task.timeSpent,
      timerStartedAt: task.timerStartedAt ? task.timerStartedAt.toISOString() : null,
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

    const {
      title,
      description,
      status,
      priority,
      isBlocked,
      blockedReason,
      ownerIds,
      assigneeIds,
      sprintId,
      startDate,
      endDate,
      estimatedHours,
      timeSpent,
      timerStartedAt
    } = (request.body ?? {}) as {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      isBlocked?: boolean;
      blockedReason?: string | null;
      ownerIds?: string[];
      assigneeIds?: string[];
      sprintId?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      estimatedHours?: number | null;
      timeSpent?: number;
      timerStartedAt?: string | null;
    };

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: {
        status: true,
        isBlocked: true,
        assignees: { select: { id: true } }
      },
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
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (estimatedHours !== undefined) dataToUpdate.estimatedHours = estimatedHours !== null ? Number(estimatedHours) : null;
    if (timeSpent !== undefined) dataToUpdate.timeSpent = Number(timeSpent);
    if (timerStartedAt !== undefined) dataToUpdate.timerStartedAt = timerStartedAt ? new Date(timerStartedAt) : null;

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
        startDate: true,
        endDate: true,
        estimatedHours: true,
        timeSpent: true,
        timerStartedAt: true,
        owners: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        },
        assignees: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      },
    });

    if (assigneeIds !== undefined && existingTask) {
      const originalAssigneeIds = existingTask.assignees.map(a => a.id);
      const newAssignees = updatedTask.assignees.filter(a => !originalAssigneeIds.includes(a.id));
      for (const a of newAssignees) {
        EmailService.sendTaskAssignedEmail(updatedTask.title, a, authUser).catch(err => {
          console.error('[EMAIL ERROR] Failed to send task assigned email:', err);
        });
      }
    }

    if (isBlocked === true && existingTask?.isBlocked === false) {
      EmailService.sendTaskBlockedEmail(updatedTask, authUser).catch(err => {
        console.error('[EMAIL ERROR] Failed to send task blocked email:', err);
      });
    }

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
      startDate: updatedTask.startDate ? updatedTask.startDate.toISOString() : null,
      endDate: updatedTask.endDate ? updatedTask.endDate.toISOString() : null,
      estimatedHours: updatedTask.estimatedHours,
      timeSpent: updatedTask.timeSpent,
      timerStartedAt: updatedTask.timerStartedAt ? updatedTask.timerStartedAt.toISOString() : null,
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

  async listComments(request: FastifyRequest, reply: FastifyReply): Promise<CommentSummary[] | void> {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });

    return comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: c.user,
    }));
  }

  async createComment(request: FastifyRequest, reply: FastifyReply): Promise<CommentSummary | void> {
    const { projectId, taskId } = request.params as { projectId: string; taskId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const { content } = request.body as { content: string };
    if (!content || !content.trim()) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Comment content cannot be empty');
    }

    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: authUser.id,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });

    const commentTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true }
    });

    if (commentTask) {
      EmailService.handleCommentMentions(comment.content, commentTask.title, comment.user).catch(err => {
        console.error('[EMAIL ERROR] Failed to check comment mentions:', err);
      });
    }

    return {
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    };
  }

  async updateComment(request: FastifyRequest, reply: FastifyReply): Promise<CommentSummary | void> {
    const { projectId, commentId } = request.params as { projectId: string; commentId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const { content } = request.body as { content: string };
    if (!content || !content.trim()) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Comment content cannot be empty');
    }

    const existing = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!existing) {
      return sendError(reply, 404, 'NOT_FOUND', 'Comment not found');
    }

    if (existing.userId !== authUser.id && authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'You can only edit your own comments');
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });

    return {
      id: updated.id,
      taskId: updated.taskId,
      userId: updated.userId,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      user: updated.user,
    };
  }

  async deleteComment(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { projectId, commentId } = request.params as { projectId: string; commentId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const existing = await prisma.comment.findUnique({
      where: { id: commentId }
    });

    if (!existing) {
      return sendError(reply, 404, 'NOT_FOUND', 'Comment not found');
    }

    if (existing.userId !== authUser.id && authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'You can only delete your own comments');
    }

    await prisma.comment.delete({
      where: { id: commentId }
    });

    return reply.status(204).send();
  }
}
