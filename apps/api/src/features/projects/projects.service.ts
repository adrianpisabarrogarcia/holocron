import type {
  AuthenticatedUser,
  ProjectMemberSummary,
  ProjectSummary,
  UpsertProjectMemberInput,
} from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  normalizeProjectRole,
  requireProjectManagerAccess,
  requireAdmin,
  sendError,
  allowedProjectRoles,
  buildProjectMemberSummary,
} from '../../shared';

export class ProjectsService {
  async listProjects(request: FastifyRequest): Promise<ProjectSummary[]> {
    const authUser = request.authUser as AuthenticatedUser;
    const projects = await prisma.project.findMany({
      where:
        authUser.platformRole === 'ADMIN'
          ? undefined
          : {
              memberships: {
                some: {
                  userId: authUser.id,
                },
              },
            },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        memberships: {
          where: {
            userId: authUser.id,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
      },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status as ProjectSummary['status'],
      membershipRole: project.memberships[0] ? normalizeProjectRole(project.memberships[0].role) : null,
      taskCount: project._count.tasks,
      completedTaskCount: project.tasks.filter((task) => task.status === 'DONE').length,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
    }));
  }

  async createProject(request: FastifyRequest, reply: FastifyReply): Promise<ProjectSummary | void> {
    const authUser = request.authUser as AuthenticatedUser;
    const { name, description, status, startDate, endDate } = (request.body ?? {}) as {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
    };

    if (!name) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Project name is required');
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status ?? 'PLANNING',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        ownerId: authUser.id,
        memberships: {
          create: {
            userId: authUser.id,
            role: 'MANAGER',
          },
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        memberships: {
          where: {
            userId: authUser.id,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
      },
    });

    reply.code(201);
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status as ProjectSummary['status'],
      membershipRole: project.memberships[0] ? normalizeProjectRole(project.memberships[0].role) : null,
      taskCount: project._count.tasks,
      completedTaskCount: project.tasks.filter((task) => task.status === 'DONE').length,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
    };
  }

  async updateProject(request: FastifyRequest, reply: FastifyReply): Promise<ProjectSummary | void> {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectManagerAccess(request, reply, projectId);
    if (!access || reply.sent) {
      return;
    }

    const { name, description, status, startDate, endDate } = (request.body ?? {}) as {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
    };

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (status !== undefined) dataToUpdate.status = status;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        startDate: true,
        endDate: true,
        memberships: {
          where: {
            userId: authUser.id,
          },
          select: {
            role: true,
          },
        },
        _count: {
          select: {
            tasks: true,
          },
        },
        tasks: {
          select: {
            status: true,
          },
        },
      },
    });

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status as ProjectSummary['status'],
      membershipRole: project.memberships[0] ? normalizeProjectRole(project.memberships[0].role) : null,
      taskCount: project._count.tasks,
      completedTaskCount: project.tasks.filter((task) => task.status === 'DONE').length,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
    };
  }

  async deleteProject(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const access = await requireProjectManagerAccess(request, reply, projectId);
    if (!access || reply.sent) {
      return;
    }

    await prisma.$transaction([
      prisma.taskStateHistory.deleteMany({
        where: {
          task: {
            projectId,
          },
        },
      }),
      prisma.task.deleteMany({
        where: { projectId },
      }),
      prisma.projectMembership.deleteMany({
        where: { projectId },
      }),
      prisma.project.delete({
        where: { id: projectId },
      }),
    ]);

    return { success: true };
  }

  async listMembers(request: FastifyRequest, reply: FastifyReply): Promise<ProjectMemberSummary[] | void> {
    const { projectId } = request.params as { projectId: string };
    const access = await requireProjectManagerAccess(request, reply, projectId);
    if (!access || reply.sent) {
      return;
    }

    const members = await prisma.projectMembership.findMany({
      where: { projectId },
      orderBy: [{ role: 'asc' }, { user: { name: 'asc' } }],
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            platformRole: true,
          },
        },
      },
    });

    return members.map(buildProjectMemberSummary);
  }

  async addOrUpdateMember(request: FastifyRequest, reply: FastifyReply): Promise<ProjectMemberSummary | void> {
    const { projectId } = request.params as { projectId: string };
    const { userId, role } = (request.body ?? {}) as Partial<UpsertProjectMemberInput>;

    if (!userId || !role) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'userId and role are required');
    }

    if (!allowedProjectRoles.has(role)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'role must be MANAGER, CONTRIBUTOR, or VIEWER');
    }

    const [project, user] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
        },
      }),
    ]);

    if (!project) {
      return sendError(reply, 404, 'NOT_FOUND', 'Project not found');
    }

    if (!user) {
      return sendError(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const membership = await prisma.projectMembership.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        projectId,
        userId,
        role,
      },
      select: {
        role: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            platformRole: true,
          },
        },
      },
    });

    reply.code(201);
    return buildProjectMemberSummary(membership);
  }
}
