import type { SprintSummary, AuthenticatedUser } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireProjectAccess, sendError } from '../../shared';
import { EmailService } from '../email/email.service';
export class SprintsService {
  async listSprints(request: FastifyRequest, reply: FastifyReply): Promise<SprintSummary[] | void> {
    const { projectId } = request.params as { projectId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    });

    return sprints.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: s.startDate ? s.startDate.toISOString() : null,
      endDate: s.endDate ? s.endDate.toISOString() : null,
      status: s.status as SprintSummary['status'],
      projectId: s.projectId,
      position: s.position,
    }));
  }

  async createSprint(request: FastifyRequest, reply: FastifyReply): Promise<SprintSummary | void> {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER' && access.membershipRole !== 'CONTRIBUTOR') {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { name, startDate, endDate } = (request.body ?? {}) as {
      name?: string;
      startDate?: string | null;
      endDate?: string | null;
    };

    if (!name) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Sprint name is required');
    }

    const count = await prisma.sprint.count({
      where: { projectId },
    });

    const sprint = await prisma.sprint.create({
      data: {
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'PLANNING',
        position: count,
        projectId,
      },
    });

    reply.code(201);
    return {
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.startDate ? sprint.startDate.toISOString() : null,
      endDate: sprint.endDate ? sprint.endDate.toISOString() : null,
      status: sprint.status as SprintSummary['status'],
      projectId: sprint.projectId,
      position: sprint.position,
    };
  }

  async updateSprint(request: FastifyRequest, reply: FastifyReply): Promise<SprintSummary | void> {
    const { projectId, sprintId } = request.params as { projectId: string; sprintId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER' && access.membershipRole !== 'CONTRIBUTOR') {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { name, startDate, endDate, status, position } = (request.body ?? {}) as {
      name?: string;
      startDate?: string | null;
      endDate?: string | null;
      status?: SprintSummary['status'];
      position?: number;
    };

    const existing = await prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!existing) {
      return sendError(reply, 404, 'NOT_FOUND', 'Sprint not found');
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (status !== undefined) dataToUpdate.status = status;
    if (position !== undefined) dataToUpdate.position = position;

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: dataToUpdate,
    });

    if (existing.status !== 'CLOSED' && updated.status === 'CLOSED') {
      EmailService.sendSprintClosedEmail(updated.name, updated.projectId, authUser).catch(err => {
        console.error('[EMAIL ERROR] Failed to send sprint closed email:', err);
      });
    }

    return {
      id: updated.id,
      name: updated.name,
      startDate: updated.startDate ? updated.startDate.toISOString() : null,
      endDate: updated.endDate ? updated.endDate.toISOString() : null,
      status: updated.status as SprintSummary['status'],
      projectId: updated.projectId,
      position: updated.position,
    };
  }

  async deleteSprint(request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean } | void> {
    const { projectId, sprintId } = request.params as { projectId: string; sprintId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER') {
      return sendError(reply, 403, 'FORBIDDEN', 'Manager role or admin is required to delete sprints');
    }

    const existing = await prisma.sprint.findUnique({
      where: { id: sprintId },
    });

    if (!existing) {
      return sendError(reply, 404, 'NOT_FOUND', 'Sprint not found');
    }

    await prisma.sprint.delete({
      where: { id: sprintId },
    });

    return { success: true };
  }
}
