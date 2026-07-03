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
  async listUsers(): Promise<AuthenticatedUser[]> {
    const users = await prisma.user.findMany({
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
      },
    });

    return users.map((user) => {
      const mapped = buildAuthUser(user);
      return {
        ...mapped,
        assignedProjects: user.memberships.map((m) => m.project.name),
        assignedFolders: user.folderMemberships.map((fm) => fm.folder.name),
      };
    });
  }

  async createUser(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser | void> {
    const { email, name, password, platformRole } = (request.body ?? {}) as {
      email?: string;
      name?: string;
      password?: string;
      platformRole?: AuthenticatedUser['platformRole'];
    };

    if (!email || !name || !password) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Email, name, and password are required');
    }

    if (platformRole && !allowedPlatformRoles.has(platformRole)) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'platformRole must be ADMIN or MEMBER');
    }

    try {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: hashPassword(password),
          platformRole: platformRole ?? 'MEMBER',
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          avatarUrl: true,
        },
      });

      reply.code(201);
      return buildAuthUser(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        return sendError(reply, 409, 'USER_EXISTS', 'A user with that email already exists');
      }

      throw error;
    }
  }

  async updateUser(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser | void> {
    const { userId } = request.params as { userId: string };
    const { email, name, password, platformRole, avatarUrl } = (request.body ?? {}) as {
      email?: string;
      name?: string;
      password?: string;
      platformRole?: AuthenticatedUser['platformRole'];
      avatarUrl?: string | null;
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

    const data: any = {};
    if (email) data.email = email;
    if (name) data.name = name;
    if (password) data.passwordHash = hashPassword(password);
    if (platformRole) data.platformRole = platformRole;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          avatarUrl: true,
        },
      });

      return buildAuthUser(updatedUser);
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

    try {
      await prisma.user.delete({
        where: { id: userId },
      });

      return { success: true };
    } catch (error) {
      return sendError(reply, 500, 'INTERNAL_ERROR', 'Failed to delete user');
    }
  }
}
