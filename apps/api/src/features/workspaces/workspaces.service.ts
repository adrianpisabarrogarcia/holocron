import type { WorkspaceSummary, WorkspaceMemberSummary } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { authenticateRequest, requireSuperAdmin, requireWorkspaceAdmin, sendError } from '../../shared';

export class WorkspacesService {
  // ─── List workspaces for the current user ──────────────────────────────────
  async listMyWorkspaces(request: FastifyRequest, reply: FastifyReply): Promise<WorkspaceSummary[] | void> {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const authUser = request.authUser!;

    if (authUser.platformRole === 'SUPERADMIN') {
      const workspaces = await prisma.workspace.findMany({
        include: {
          _count: { select: { memberships: true, projects: true } },
        },
        orderBy: { name: 'asc' },
      });
      return workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        logoUrl: ws.logoUrl,
        primaryColor: ws.primaryColor,
        memberCount: ws._count.memberships,
        projectCount: ws._count.projects,
      }));
    }

    const memberships = await prisma.workspaceMembership.findMany({
      where: { userId: authUser.id },
      include: {
        workspace: {
          include: { _count: { select: { memberships: true, projects: true } } },
        },
      },
      orderBy: { workspace: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      logoUrl: m.workspace.logoUrl,
      primaryColor: m.workspace.primaryColor,
      memberCount: m.workspace._count.memberships,
      projectCount: m.workspace._count.projects,
      workspaceRole: m.workspaceRole as 'WORKSPACE_ADMIN' | 'MEMBER',
    }));
  }

  // ─── Get single workspace ──────────────────────────────────────────────────
  async getWorkspace(request: FastifyRequest, reply: FastifyReply) {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const { slug } = request.params as { slug: string };

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: { _count: { select: { memberships: true, projects: true } } },
    });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      logoUrl: workspace.logoUrl,
      primaryColor: workspace.primaryColor,
      memberCount: workspace._count.memberships,
      projectCount: workspace._count.projects,
    };
  }

  // ─── Create workspace (SUPERADMIN only) ────────────────────────────────────
  async createWorkspace(request: FastifyRequest, reply: FastifyReply) {
    await requireSuperAdmin(request, reply);
    if (reply.sent) return;

    const { name, slug, description, primaryColor } = (request.body ?? {}) as {
      name?: string;
      slug?: string;
      description?: string;
      primaryColor?: string;
    };

    if (!name || !slug) return sendError(reply, 400, 'VALIDATION_ERROR', 'name and slug are required');

    const normalized = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    try {
      const workspace = await prisma.workspace.create({
        data: { name, slug: normalized, description, primaryColor },
      });
      reply.code(201);
      return workspace;
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unique constraint')) {
        return sendError(reply, 409, 'WORKSPACE_EXISTS', 'A workspace with that slug already exists');
      }
      throw err;
    }
  }

  // ─── Update workspace (WORKSPACE_ADMIN or SUPERADMIN) ──────────────────────
  async updateWorkspace(request: FastifyRequest, reply: FastifyReply) {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const { slug } = request.params as { slug: string };

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    await requireWorkspaceAdmin(request, reply, workspace.id);
    if (reply.sent) return;

    const { name, description, logoUrl, primaryColor } = (request.body ?? {}) as {
      name?: string;
      description?: string;
      logoUrl?: string;
      primaryColor?: string;
    };

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(primaryColor !== undefined && { primaryColor }),
      },
    });
    return updated;
  }

  // ─── Delete workspace (SUPERADMIN only) ────────────────────────────────────
  async deleteWorkspace(request: FastifyRequest, reply: FastifyReply) {
    await requireSuperAdmin(request, reply);
    if (reply.sent) return;
    const { slug } = request.params as { slug: string };

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    await prisma.workspace.delete({ where: { id: workspace.id } });
    return { success: true };
  }

  // ─── List workspace members ────────────────────────────────────────────────
  async listMembers(request: FastifyRequest, reply: FastifyReply): Promise<WorkspaceMemberSummary[] | void> {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const { slug } = request.params as { slug: string };

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    await requireWorkspaceAdmin(request, reply, workspace.id);
    if (reply.sent) return;

    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true, platformRole: true, avatarUrl: true } } },
      orderBy: { user: { name: 'asc' } },
    });

    return memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      platformRole: m.user.platformRole as 'SUPERADMIN' | 'ADMIN' | 'MEMBER',
      workspaceRole: m.workspaceRole as 'WORKSPACE_ADMIN' | 'MEMBER',
      avatarUrl: m.user.avatarUrl,
    }));
  }

  // ─── Invite user by email (creates if not exists) ──────────────────────────
  async inviteMember(request: FastifyRequest, reply: FastifyReply) {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const { slug } = request.params as { slug: string };

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    await requireWorkspaceAdmin(request, reply, workspace.id);
    if (reply.sent) return;

    const { email, name, workspaceRole } = (request.body ?? {}) as {
      email?: string;
      name?: string;
      workspaceRole?: string;
    };

    if (!email) return sendError(reply, 400, 'VALIDATION_ERROR', 'email is required');
    const role = workspaceRole === 'WORKSPACE_ADMIN' ? 'WORKSPACE_ADMIN' : 'MEMBER';

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      if (!name) return sendError(reply, 400, 'VALIDATION_ERROR', 'name is required for new users');
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: '',
          platformRole: 'MEMBER',
          isActive: true,
          activeWorkspaceId: workspace.id,
        },
      });
    }

    // Add to workspace
    await prisma.workspaceMembership.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { workspaceRole: role },
      create: { workspaceId: workspace.id, userId: user.id, workspaceRole: role },
    });

    return { success: true, userId: user.id };
  }

  // ─── Update member role ────────────────────────────────────────────────────
  async updateMember(request: FastifyRequest, reply: FastifyReply) {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const { slug, userId } = request.params as { slug: string; userId: string };

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    await requireWorkspaceAdmin(request, reply, workspace.id);
    if (reply.sent) return;

    const { workspaceRole } = (request.body ?? {}) as { workspaceRole?: string };
    const role = workspaceRole === 'WORKSPACE_ADMIN' ? 'WORKSPACE_ADMIN' : 'MEMBER';

    const updated = await prisma.workspaceMembership.update({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
      data: { workspaceRole: role },
    });
    return updated;
  }

  // ─── Remove member ──────────────────────────────────────────────────────────
  async removeMember(request: FastifyRequest, reply: FastifyReply) {
    await authenticateRequest(request, reply);
    if (reply.sent) return;
    const { slug, userId } = request.params as { slug: string; userId: string };

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    await requireWorkspaceAdmin(request, reply, workspace.id);
    if (reply.sent) return;

    // Prevent removing yourself
    if (request.authUser?.id === userId) {
      return sendError(reply, 400, 'BAD_REQUEST', 'You cannot remove yourself from the workspace');
    }

    await prisma.workspaceMembership.delete({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    return { success: true };
  }

  // ─── Switch active workspace ────────────────────────────────────────────────
  async switchWorkspace(request: FastifyRequest, reply: FastifyReply) {
    await authenticateRequest(request, reply);
    if (reply.sent) return;

    const { slug } = (request.body ?? {}) as { slug?: string };
    if (!slug) return sendError(reply, 400, 'VALIDATION_ERROR', 'slug is required');

    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace) return sendError(reply, 404, 'NOT_FOUND', 'Workspace not found');

    const authUser = request.authUser!;

    // Check access (SUPERADMIN can switch to any workspace)
    if (authUser.platformRole !== 'SUPERADMIN') {
      const membership = await prisma.workspaceMembership.findUnique({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: authUser.id } },
      });
      if (!membership) return sendError(reply, 403, 'FORBIDDEN', 'You are not a member of this workspace');
    }

    await prisma.user.update({
      where: { id: authUser.id },
      data: { activeWorkspaceId: workspace.id },
    });

    return { success: true, workspaceId: workspace.id, slug: workspace.slug };
  }
}
