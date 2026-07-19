import type { AuthenticatedUser } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  hashPassword,
  buildAuthUser,
  sendError,
  allowedPlatformRoles,
} from '../../shared';

export class UsersService {
  async listUsers(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser[] | void> {
    const currentUser = request.authUser as AuthenticatedUser;
    if (!currentUser) {
      return sendError(reply, 401, 'UNAUTHORIZED', 'Authentication is required');
    }

    const whereClause: any = {};

    if (currentUser.platformRole === 'ADMIN') {
      // Un admin solo ve usuarios que pertenezcan a los mismos workspaces que él
      const memberships = await prisma.workspaceMembership.findMany({
        where: { userId: currentUser.id },
        select: { workspaceId: true },
      });
      const workspaceIds = memberships.map((m) => m.workspaceId);

      whereClause.workspaceMemberships = {
        some: {
          workspaceId: { in: workspaceIds },
        },
      };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        avatarUrl: true,
        memberships: {
          select: {
            project: {
              select: {
                name: true,
              },
            },
          },
        },
        folderMemberships: {
          select: {
            folder: {
              select: {
                name: true,
              },
            },
          },
        },
        workspaceMemberships: {
          select: {
            workspace: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return users.map((user) => {
      const mapped = buildAuthUser(user);
      return {
        ...mapped,
        assignedProjects: user.memberships.map((m) => m.project.name),
        assignedFolders: user.folderMemberships.map((fm) => fm.folder.name),
        assignedWorkspaces: user.workspaceMemberships.map((wm) => wm.workspace.name),
      };
    });
  }

  async createUser(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser | void> {
    const currentUser = request.authUser as AuthenticatedUser;
    const { email, name, platformRole, workspaceIds } = (request.body ?? {}) as {
      email?: string;
      name?: string;
      platformRole?: AuthenticatedUser['platformRole'];
      workspaceIds?: string[];
    };

    if (!email || !name) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Email and name are required');
    }

    if (platformRole && !allowedPlatformRoles.has(platformRole)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'platformRole must be ADMIN or MEMBER');
    }

    // Un admin no puede crear a un superadmin ni otorgar ese rol
    if (platformRole === 'SUPERADMIN' && currentUser.platformRole !== 'SUPERADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Only superadministrators can assign the superadministrator role');
    }

    // Validar workspaces del admin si no es SUPERADMIN
    if (currentUser && currentUser.platformRole === 'ADMIN') {
      const adminMemberships = await prisma.workspaceMembership.findMany({
        where: { userId: currentUser.id },
        select: { workspaceId: true },
      });
      const adminWorkspaceIds = adminMemberships.map((m) => m.workspaceId);

      if (workspaceIds) {
        const hasInvalidWorkspace = workspaceIds.some((id) => !adminWorkspaceIds.includes(id));
        if (hasInvalidWorkspace) {
          return sendError(reply, 403, 'FORBIDDEN', 'You can only assign users to your own workspaces');
        }
      } else {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Workspace assignment is required for administrators');
      }
    }

    try {
      // Find or create user
      let user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name,
            platformRole: platformRole ?? user.platformRole,
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash: '',
            platformRole: platformRole ?? 'MEMBER',
            isActive: true,
          },
        });
      }

      // Sync workspace memberships
      if (workspaceIds) {
        await prisma.workspaceMembership.deleteMany({
          where: {
            userId: user.id,
            workspaceId: { notIn: workspaceIds },
          },
        });
        for (const workspaceId of workspaceIds) {
          await prisma.workspaceMembership.upsert({
            where: { workspaceId_userId: { workspaceId, userId: user.id } },
            update: {},
            create: { workspaceId, userId: user.id, workspaceRole: 'MEMBER' },
          });
        }
      }

      // Reload user with workspace memberships
      const reloadedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          avatarUrl: true,
          workspaceMemberships: {
            select: {
              workspace: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!reloadedUser) throw new Error('User not found after creation');

      const mapped = buildAuthUser(reloadedUser);
      reply.code(201);
      return {
        ...mapped,
        assignedWorkspaces: reloadedUser.workspaceMemberships.map((wm) => wm.workspace.name),
        assignedProjects: [],
        assignedFolders: [],
      };
    } catch (error) {
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to create/assign user');
    }
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser | void> {
    const currentUser = request.authUser as AuthenticatedUser;
    const { userId } = request.params as { userId: string };
    const { email, name, password, platformRole, avatarUrl, workspaceIds } = (request.body ?? {}) as {
      email?: string;
      name?: string;
      password?: string;
      platformRole?: AuthenticatedUser['platformRole'];
      avatarUrl?: string | null;
      workspaceIds?: string[];
    };

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return sendError(reply, 404, 'NOT_FOUND', 'User not found');
    }

    if (platformRole && !allowedPlatformRoles.has(platformRole)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'platformRole must be ADMIN or MEMBER');
    }

    // Un admin no puede otorgar el rol de superadmin ni quitárselo a nadie
    if (platformRole === 'SUPERADMIN' && currentUser.platformRole !== 'SUPERADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Only superadministrators can assign the superadministrator role');
    }

    // Validar acceso del admin si no es SUPERADMIN
    let adminWorkspaceIds: string[] = [];
    if (currentUser && currentUser.platformRole === 'ADMIN') {
      // Un ADMIN nunca puede editar a un SUPERADMIN
      if (user.platformRole === 'SUPERADMIN') {
        return sendError(reply, 403, 'FORBIDDEN', 'Administrators cannot manage superadministrators');
      }
      const adminMemberships = await prisma.workspaceMembership.findMany({
        where: { userId: currentUser.id },
        select: { workspaceId: true },
      });
      adminWorkspaceIds = adminMemberships.map((m) => m.workspaceId);

      const targetUserMemberships = await prisma.workspaceMembership.findMany({
        where: { userId },
        select: { workspaceId: true },
      });
      const targetWorkspaceIds = targetUserMemberships.map((m) => m.workspaceId);

      const sharesWorkspace = targetWorkspaceIds.some((id) => adminWorkspaceIds.includes(id));
      if (!sharesWorkspace) {
        return sendError(reply, 403, 'FORBIDDEN', 'You do not have permission to manage this user');
      }

      if (workspaceIds) {
        const hasInvalidWorkspace = workspaceIds.some((id) => !adminWorkspaceIds.includes(id));
        if (hasInvalidWorkspace) {
          return sendError(reply, 403, 'FORBIDDEN', 'You can only assign users to your own workspaces');
        }
      }
    }

    const data: any = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (password) data.passwordHash = hashPassword(password);
    if (platformRole) data.platformRole = platformRole;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    try {
      await prisma.user.update({
        where: { id: userId },
        data,
      });

      // Sync workspace memberships
      if (workspaceIds) {
        if (currentUser && currentUser.platformRole === 'ADMIN') {
          // Un admin solo gestiona memberships dentro de sus propios workspaces
          await prisma.workspaceMembership.deleteMany({
            where: {
              userId: userId,
              workspaceId: {
                in: adminWorkspaceIds,
                notIn: workspaceIds,
              },
            },
          });
          for (const workspaceId of workspaceIds) {
            await prisma.workspaceMembership.upsert({
              where: { workspaceId_userId: { workspaceId, userId } },
              update: {},
              create: { workspaceId, userId, workspaceRole: 'MEMBER' },
            });
          }
        } else {
          // El superadmin puede cambiar todo
          await prisma.workspaceMembership.deleteMany({
            where: {
              userId: userId,
              workspaceId: { notIn: workspaceIds },
            },
          });
          for (const workspaceId of workspaceIds) {
            await prisma.workspaceMembership.upsert({
              where: { workspaceId_userId: { workspaceId, userId } },
              update: {},
              create: { workspaceId, userId, workspaceRole: 'MEMBER' },
            });
          }
        }
      }

      // Reload user with memberships
      const reloadedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          avatarUrl: true,
          memberships: {
            select: {
              project: {
                select: {
                  name: true,
                },
              },
            },
          },
          folderMemberships: {
            select: {
              folder: {
                select: {
                  name: true,
                },
              },
            },
          },
          workspaceMemberships: {
            select: {
              workspace: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!reloadedUser) throw new Error('User not found after update');

      const mapped = buildAuthUser(reloadedUser);
      return {
        ...mapped,
        assignedProjects: reloadedUser.memberships.map((m) => m.project.name),
        assignedFolders: reloadedUser.folderMemberships.map((fm) => fm.folder.name),
        assignedWorkspaces: reloadedUser.workspaceMemberships.map((wm) => wm.workspace.name),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return sendError(reply, 409, 'USER_EXISTS', 'A user with that email already exists');
      }
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to update user');
    }
  }

  async deleteUser(request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean } | void> {
    const { userId } = request.params as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return sendError(reply, 404, 'NOT_FOUND', 'User not found');
    }

    const currentUser = request.authUser as AuthenticatedUser;
    if (currentUser.id === userId) {
      return sendError(reply, 400, 'BAD_REQUEST', 'You cannot delete yourself');
    }

    // Prevent ADMIN from deleting a SUPERADMIN
    if (user.platformRole === 'SUPERADMIN' && currentUser.platformRole !== 'SUPERADMIN') {
      return sendError(reply, 403, 'FORBIDDEN', 'Administrators cannot delete superadministrators');
    }

    // Si es ADMIN, verificar si comparte workspace y si el usuario a borrar pertenece a algún workspace externo
    if (currentUser && currentUser.platformRole === 'ADMIN') {
      const adminMemberships = await prisma.workspaceMembership.findMany({
        where: { userId: currentUser.id },
        select: { workspaceId: true },
      });
      const adminWorkspaceIds = adminMemberships.map((m) => m.workspaceId);

      const targetUserMemberships = await prisma.workspaceMembership.findMany({
        where: { userId },
        select: { workspaceId: true },
      });
      const targetWorkspaceIds = targetUserMemberships.map((m) => m.workspaceId);

      const sharesWorkspace = targetWorkspaceIds.some((id) => adminWorkspaceIds.includes(id));
      if (!sharesWorkspace) {
        return sendError(reply, 403, 'FORBIDDEN', 'You do not have permission to delete this user');
      }

      const belongsToExternalWorkspace = targetWorkspaceIds.some((id) => !adminWorkspaceIds.includes(id));
      if (belongsToExternalWorkspace) {
        return sendError(reply, 400, 'BAD_REQUEST', 'Cannot delete user because they belong to other workspaces outside your management. Remove their memberships instead.');
      }
    }

    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      return { success: true };
    } catch (error) {
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to delete user');
    }
  }

  async bulkImportUsers(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.authUser as AuthenticatedUser;
    const { users } = (request.body ?? {}) as {
      users?: Array<{ email: string; name: string; platformRole?: string }>;
    };

    if (!users || !Array.isArray(users)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'A users array is required');
    }

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    // Si es un ADMIN, se requiere que tenga un activeWorkspaceId para asociar los usuarios importados
    let targetWorkspaceId: string | null = null;
    if (currentUser && currentUser.platformRole === 'ADMIN') {
      if (!currentUser.activeWorkspaceId) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Active workspace is required to import users');
      }
      targetWorkspaceId = currentUser.activeWorkspaceId;
    }

    for (const item of users) {
      if (!item.email || !item.name) {
        results.errors.push(`Usuario omitido: Falta email o nombre para: ${JSON.stringify(item)}`);
        continue;
      }

      const role = item.platformRole === 'ADMIN' ? 'ADMIN' : 'MEMBER';

      try {
        let user;
        const existing = await prisma.user.findUnique({
          where: { email: item.email },
        });

        if (existing) {
          user = await prisma.user.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              platformRole: role,
            },
          });
          results.updated++;
        } else {
          user = await prisma.user.create({
            data: {
              email: item.email,
              name: item.name,
              passwordHash: '',
              platformRole: role,
              isActive: true,
            },
          });
          results.created++;
        }

        // Si hay un workspace destino (el caso del admin), asociamos al usuario a ese workspace
        if (targetWorkspaceId && user) {
          await prisma.workspaceMembership.upsert({
            where: { workspaceId_userId: { workspaceId: targetWorkspaceId, userId: user.id } },
            update: {},
            create: { workspaceId: targetWorkspaceId, userId: user.id, workspaceRole: 'MEMBER' },
          });
        }
      } catch (error) {
        results.errors.push(`Error al importar ${item.email}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return results;
  }

  async getNotifications(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.authUser as AuthenticatedUser;
    if (!currentUser) return sendError(reply, 401, 'UNAUTHORIZED', 'Authentication is required');

    let prefs = await prisma.notificationPreference.findUnique({
      where: { userId: currentUser.id },
    });

    if (!prefs) {
      prefs = await prisma.notificationPreference.create({
        data: { userId: currentUser.id },
      });
    }

    return prefs;
  }

  async updateNotifications(request: FastifyRequest, reply: FastifyReply) {
    const currentUser = request.authUser as AuthenticatedUser;
    if (!currentUser) return sendError(reply, 401, 'UNAUTHORIZED', 'Authentication is required');

    const body = (request.body ?? {}) as any;
    const { onTaskAssigned, onTaskUnassigned, onTaskStatusChanged, onCommentAdded } = body;

    const data: any = {};
    if (onTaskAssigned !== undefined) data.onTaskAssigned = onTaskAssigned;
    if (onTaskUnassigned !== undefined) data.onTaskUnassigned = onTaskUnassigned;
    if (onTaskStatusChanged !== undefined) data.onTaskStatusChanged = onTaskStatusChanged;
    if (onCommentAdded !== undefined) data.onCommentAdded = onCommentAdded;

    const prefs = await prisma.notificationPreference.upsert({
      where: { userId: currentUser.id },
      update: data,
      create: {
        userId: currentUser.id,
        ...data,
      },
    });

    return prefs;
  }
}
