import type {
  AuthenticatedUser,
  FolderMemberSummary,
  UpsertFolderMemberInput,
  ProjectMemberSummary,
  ProjectSummary,
  ProjectColumnSummary,
  UpsertProjectMemberInput,
  ScrumRole,
  ProjectMembershipRole,
} from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  normalizeProjectRole,
  compareProjectRoles,
  collectFolderAncestorIds,
  requireProjectManagerAccess,
  requireProjectAccess,
  requireAdmin,
  sendError,
  allowedProjectRoles,
  allowedScrumRoles,
  buildProjectMemberSummary,
  buildFolderMemberSummary,
} from '../../shared';

export function getProjectColumns(project: any): ProjectColumnSummary[] {
  if (project.columns && project.columns.length > 0) {
    return project.columns.map((c: any) => ({
      id: c.id,
      projectId: c.projectId,
      name: c.name,
      position: c.position,
    }));
  }
  return [
    { id: 'todo', projectId: project.id, name: 'Por Hacer', position: 0 },
    { id: 'in_progress', projectId: project.id, name: 'En Progreso', position: 1 },
    { id: 'test', projectId: project.id, name: 'Test', position: 2 },
    { id: 'done', projectId: project.id, name: 'Completado', position: 3 },
  ];
}

export function getCompletedTaskCount(project: any, cols: ProjectColumnSummary[]): number {
  const lastCol = cols.reduce((max, col) => (col.position > max.position ? col : max), cols[0]);
  if (!lastCol) return 0;
  return project.tasks.filter((t: any) => t.status === lastCol.name).length;
}

export class ProjectsService {
  async listProjects(request: FastifyRequest): Promise<ProjectSummary[]> {
    const authUser = request.authUser as AuthenticatedUser;
    const [projects, directMemberships, folderMemberships, folders] = await Promise.all([
      prisma.project.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          startDate: true,
          endDate: true,
          folderId: true,
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
          columns: {
            orderBy: {
              position: 'asc',
            },
            select: {
              id: true,
              projectId: true,
              name: true,
              position: true,
            },
          },
        },
      }),
      authUser.platformRole === 'ADMIN'
        ? Promise.resolve([] as Array<{ projectId: string; role: string }>)
        : prisma.projectMembership.findMany({
            where: {
              userId: authUser.id,
            },
            select: {
              projectId: true,
              role: true,
            },
          }),
      authUser.platformRole === 'ADMIN'
        ? Promise.resolve([] as Array<{ folderId: string; role: string }>)
        : prisma.folderMembership.findMany({
            where: {
              userId: authUser.id,
            },
            select: {
              folderId: true,
              role: true,
            },
          }),
      authUser.platformRole === 'ADMIN'
        ? Promise.resolve([] as Array<{ id: string; parentFolderId: string | null }>)
        : prisma.folder.findMany({
            select: {
              id: true,
              parentFolderId: true,
            },
          }),
    ]);

    if (authUser.platformRole === 'ADMIN') {
      return projects.map((project) => {
        const cols = getProjectColumns(project);
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status as ProjectSummary['status'],
          membershipRole: null,
          taskCount: project._count.tasks,
          completedTaskCount: getCompletedTaskCount(project, cols),
          startDate: project.startDate ? project.startDate.toISOString() : null,
          endDate: project.endDate ? project.endDate.toISOString() : null,
          folderId: project.folderId,
          columns: cols,
        };
      });
    }

    const folderParentById = new Map(folders.map((folder) => [folder.id, folder.parentFolderId] as const));
    const directRoleByProjectId = new Map<string, ProjectSummary['membershipRole']>();
    for (const membership of directMemberships) {
      const role = normalizeProjectRole(membership.role);
      if (!role) {
        throw new Error(`Unsupported project role: ${membership.role}`);
      }
      directRoleByProjectId.set(membership.projectId, role);
    }

    const folderRoleById = new Map<string, ProjectSummary['membershipRole']>();
    for (const membership of folderMemberships) {
      const role = normalizeProjectRole(membership.role);
      if (!role) {
        throw new Error(`Unsupported folder role: ${membership.role}`);
      }
      folderRoleById.set(membership.folderId, role);
    }

    return projects
      .map((project): ProjectSummary | null => {
        const ancestorFolderIds = collectFolderAncestorIds(project.folderId, folderParentById);
        let membershipRole = directRoleByProjectId.get(project.id) ?? null;

        for (const ancestorFolderId of ancestorFolderIds) {
          membershipRole = compareProjectRoles(membershipRole, folderRoleById.get(ancestorFolderId) ?? null);
        }

        if (!membershipRole) {
          return null;
        }

        const cols = getProjectColumns(project);
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status as ProjectSummary['status'],
          membershipRole,
          taskCount: project._count.tasks,
          completedTaskCount: getCompletedTaskCount(project, cols),
          startDate: project.startDate ? project.startDate.toISOString() : null,
          endDate: project.endDate ? project.endDate.toISOString() : null,
          folderId: project.folderId,
          columns: cols,
        } satisfies ProjectSummary;
      })
      .filter((project): project is ProjectSummary => project !== null);
  }

  async createProject(request: FastifyRequest, reply: FastifyReply): Promise<ProjectSummary | void> {
    const authUser = request.authUser as AuthenticatedUser;
    const { name, description, status, startDate, endDate, folderId } = (request.body ?? {}) as {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
      folderId?: string | null;
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
        folderId: folderId ?? null,
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
        folderId: true,
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
      folderId: project.folderId,
    };
  }

  async updateProject(request: FastifyRequest, reply: FastifyReply): Promise<ProjectSummary | void> {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectManagerAccess(request, reply, projectId);
    if (!access || reply.sent) {
      return;
    }

    const { name, description, status, startDate, endDate, folderId } = (request.body ?? {}) as {
      name?: string;
      description?: string;
      status?: string;
      startDate?: string | null;
      endDate?: string | null;
      folderId?: string | null;
    };

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name;
    if (description !== undefined) dataToUpdate.description = description;
    if (status !== undefined) dataToUpdate.status = status;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) dataToUpdate.endDate = endDate ? new Date(endDate) : null;
    if (folderId !== undefined) dataToUpdate.folderId = folderId;

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
        folderId: true,
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
      folderId: project.folderId,
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
        scrumRole: true,
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
    const { userId, role, scrumRole } = (request.body ?? {}) as Partial<UpsertProjectMemberInput>;

    if (!userId || !role) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'userId and role are required');
    }

    if (!allowedProjectRoles.has(role)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'role must be MANAGER, CONTRIBUTOR, or VIEWER');
    }

    if (scrumRole && !allowedScrumRoles.has(scrumRole as ScrumRole)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'scrumRole must be DEVELOPER, PRODUCT_OWNER, or SCRUM_MASTER');
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
        scrumRole: scrumRole || null,
      },
      create: {
        projectId,
        userId,
        role,
        scrumRole: scrumRole || null,
      },
      select: {
        role: true,
        scrumRole: true,
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

  async addOrUpdateFolderMember(request: FastifyRequest, reply: FastifyReply): Promise<FolderMemberSummary | void> {
    const { folderId } = request.params as { folderId: string };
    const { userId, role } = (request.body ?? {}) as Partial<UpsertFolderMemberInput>;

    if (!userId || !role) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'userId and role are required');
    }

    if (!allowedProjectRoles.has(role)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'role must be MANAGER, CONTRIBUTOR, or VIEWER');
    }

    const [folder, user] = await Promise.all([
      prisma.folder.findUnique({
        where: { id: folderId },
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

    if (!folder) {
      return sendError(reply, 404, 'NOT_FOUND', 'Folder not found');
    }

    if (!user) {
      return sendError(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const membership = await prisma.folderMembership.upsert({
      where: {
        folderId_userId: {
          folderId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        folderId,
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
    return buildFolderMemberSummary(membership);
  }

  async listFolders(request: FastifyRequest, reply: FastifyReply): Promise<any[] | void> {
    const folders = await prisma.folder.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        parentFolderId: true,
        createdAt: true,
      },
    });

    return folders.map((f) => ({
      ...f,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async createFolder(request: FastifyRequest, reply: FastifyReply): Promise<any | void> {
    const authUser = request.authUser as AuthenticatedUser;
    if (authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Admin role is required to manage folders');
    }

    const { name, parentFolderId } = (request.body ?? {}) as {
      name?: string;
      parentFolderId?: string | null;
    };

    if (!name) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Folder name is required');
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        parentFolderId: parentFolderId ?? null,
      },
      select: {
        id: true,
        name: true,
        parentFolderId: true,
        createdAt: true,
      },
    });

    reply.code(201);
    return {
      ...folder,
      createdAt: folder.createdAt.toISOString(),
    };
  }

  async deleteFolder(request: FastifyRequest, reply: FastifyReply) {
    const authUser = request.authUser as AuthenticatedUser;
    if (authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Admin role is required to manage folders');
    }

    const { folderId } = request.params as { folderId: string };

    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      select: { id: true },
    });

    if (!folder) {
      return sendError(reply, 404, 'NOT_FOUND', 'Folder not found');
    }

    await prisma.folder.delete({
      where: { id: folderId },
    });

    return { success: true };
  }

  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    const authUser = request.authUser as AuthenticatedUser;
    if (authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Admin role is required to manage members');
    }

    const { projectId, userId } = request.params as { projectId: string; userId: string };

    await prisma.projectMembership.deleteMany({
      where: { projectId, userId },
    });

    return { success: true };
  }

  async removeFolderMember(request: FastifyRequest, reply: FastifyReply) {
    const authUser = request.authUser as AuthenticatedUser;
    if (authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Admin role is required to manage folder members');
    }

    const { folderId, userId } = request.params as { folderId: string; userId: string };

    await prisma.folderMembership.deleteMany({
      where: { folderId, userId },
    });

    return { success: true };
  }

  async listFolderMembers(request: FastifyRequest, reply: FastifyReply) {
    const authUser = request.authUser as AuthenticatedUser;
    if (authUser.platformRole !== 'ADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Admin role is required');
    }

    const { folderId } = request.params as { folderId: string };

    const folderMembers = await prisma.folderMembership.findMany({
      where: { folderId },
      orderBy: { user: { name: 'asc' } },
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

    return folderMembers.map(buildFolderMemberSummary);
  }

  async syncProjectColumns(request: FastifyRequest, reply: FastifyReply) {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (authUser.platformRole !== 'ADMIN' && access.membershipRole !== 'MANAGER' && access.membershipRole !== 'CONTRIBUTOR') {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { columns } = (request.body ?? {}) as {
      columns?: Array<{ id?: string; name: string; position: number }>;
    };

    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'At least one column is required');
    }

    // Sort by position
    const sortedCols = [...columns].sort((a, b) => a.position - b.position);

    // We run inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Get current columns
      const currentCols = await tx.projectColumn.findMany({
        where: { projectId },
      });

      const currentIds = currentCols.map((c) => c.id);
      const payloadIds = sortedCols.map((c) => c.id).filter(Boolean) as string[];

      // Columns to delete
      const idsToDelete = currentIds.filter((id) => !payloadIds.includes(id));
      const colsToDelete = currentCols.filter((c) => idsToDelete.includes(c.id));

      // First new column name (fallback status)
      const firstColumnName = sortedCols[0].name;

      // 2. If deleting columns, move tasks in those columns to the first column in the payload
      if (colsToDelete.length > 0) {
        const deletedNames = colsToDelete.map((c) => c.name);
        await tx.task.updateMany({
          where: {
            projectId,
            status: { in: deletedNames },
          },
          data: {
            status: firstColumnName,
          },
        });

        // Delete them
        await tx.projectColumn.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });
      }

      // 3. Update existing and create new
      for (const col of sortedCols) {
        if (col.id) {
          // Update
          await tx.projectColumn.update({
            where: { id: col.id },
            data: {
              name: col.name,
              position: col.position,
            },
          });
        } else {
          // Create
          await tx.projectColumn.create({
            data: {
              projectId,
              name: col.name,
              position: col.position,
            },
          });
        }
      }
    });

    // Fetch and return the new columns
    const updatedCols = await prisma.projectColumn.findMany({
      where: { projectId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        projectId: true,
        name: true,
        position: true,
      },
    });

    return updatedCols;
  }
}
