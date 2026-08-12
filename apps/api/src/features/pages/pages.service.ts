import type { AuthenticatedUser, PageSummary, PageDetail, PageVersionSummary, PageVersionDetail } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { requireProjectAccess, sendError } from '../../shared';

const userMiniSelect = { id: true, name: true, email: true, avatarUrl: true } as const;

const pageDetailSelect = {
  id: true,
  projectId: true,
  parentPageId: true,
  title: true,
  content: true,
  position: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: userMiniSelect },
  updatedBy: { select: userMiniSelect },
} as const;

function hasWriteAccess(authUser: AuthenticatedUser, membershipRole: string | null): boolean {
  return authUser.platformRole === 'ADMIN' || membershipRole === 'MANAGER' || membershipRole === 'CONTRIBUTOR';
}

export class PagesService {
  async listPages(request: FastifyRequest, reply: FastifyReply): Promise<PageSummary[] | void> {
    const { projectId } = request.params as { projectId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const pages = await prisma.page.findMany({
      where: { projectId },
      orderBy: [{ parentPageId: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        projectId: true,
        parentPageId: true,
        title: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: userMiniSelect },
        updatedBy: { select: userMiniSelect },
      },
    });

    return pages.map((page) => ({
      ...page,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    }));
  }

  async getPage(request: FastifyRequest, reply: FastifyReply): Promise<PageDetail | void> {
    const { projectId, pageId } = request.params as { projectId: string; pageId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const page = await prisma.page.findUnique({ where: { id: pageId }, select: pageDetailSelect });

    if (!page || page.projectId !== projectId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Page not found');
    }

    return {
      ...page,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  async createPage(request: FastifyRequest, reply: FastifyReply): Promise<PageDetail | void> {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (!hasWriteAccess(authUser, access.membershipRole)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { title, content, parentPageId } = (request.body ?? {}) as {
      title?: string;
      content?: string;
      parentPageId?: string | null;
    };

    if (!title || !title.trim()) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Page title is required');
    }

    let resolvedParentId: string | null = null;
    if (parentPageId) {
      const parent = await prisma.page.findUnique({ where: { id: parentPageId }, select: { id: true, projectId: true } });
      if (!parent || parent.projectId !== projectId) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Parent page must belong to the same project');
      }
      resolvedParentId = parent.id;
    }

    const position = await prisma.page.count({ where: { projectId, parentPageId: resolvedParentId } });

    const page = await prisma.page.create({
      data: {
        title: title.trim(),
        content: content ?? '',
        projectId,
        parentPageId: resolvedParentId,
        position,
        createdById: authUser.id,
        updatedById: authUser.id,
      },
      select: pageDetailSelect,
    });

    reply.code(201);
    return {
      ...page,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    };
  }

  private async wouldCreateCycle(pageId: string, newParentId: string): Promise<boolean> {
    let currentId: string | null = newParentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === pageId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);
      const current: { parentPageId: string | null } | null = await prisma.page.findUnique({
        where: { id: currentId },
        select: { parentPageId: true },
      });
      if (!current) return false;
      currentId = current.parentPageId;
    }
    return false;
  }

  async updatePage(request: FastifyRequest, reply: FastifyReply): Promise<PageDetail | void> {
    const { projectId, pageId } = request.params as { projectId: string; pageId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (!hasWriteAccess(authUser, access.membershipRole)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const existing = await prisma.page.findUnique({ where: { id: pageId } });
    if (!existing || existing.projectId !== projectId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Page not found');
    }

    const { title, content, parentPageId, position } = (request.body ?? {}) as {
      title?: string;
      content?: string;
      parentPageId?: string | null;
      position?: number;
    };

    if (title !== undefined && !title.trim()) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'Page title cannot be empty');
    }

    let resolvedParentId: string | null | undefined = undefined;
    if (parentPageId !== undefined) {
      if (parentPageId === null) {
        resolvedParentId = null;
      } else {
        if (parentPageId === pageId) {
          return sendError(reply, 400, 'VALIDATION_ERROR', 'A page cannot be its own parent');
        }
        const parent = await prisma.page.findUnique({ where: { id: parentPageId }, select: { id: true, projectId: true } });
        if (!parent || parent.projectId !== projectId) {
          return sendError(reply, 400, 'VALIDATION_ERROR', 'Parent page must belong to the same project');
        }
        if (await this.wouldCreateCycle(pageId, parentPageId)) {
          return sendError(reply, 400, 'VALIDATION_ERROR', 'Cannot move a page under itself or one of its own descendants');
        }
        resolvedParentId = parent.id;
      }
    }

    const dataToUpdate: any = { updatedById: authUser.id };
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (content !== undefined) dataToUpdate.content = content;
    if (resolvedParentId !== undefined) dataToUpdate.parentPageId = resolvedParentId;
    if (position !== undefined) dataToUpdate.position = position;

    const titleChanged = title !== undefined && title.trim() !== existing.title;
    const contentChanged = content !== undefined && content !== existing.content;

    let updated;
    if (titleChanged || contentChanged) {
      const [, updatedPage] = await prisma.$transaction([
        prisma.pageVersion.create({
          data: {
            pageId,
            title: existing.title,
            content: existing.content,
            editedById: authUser.id,
          },
        }),
        prisma.page.update({ where: { id: pageId }, data: dataToUpdate, select: pageDetailSelect }),
      ]);
      updated = updatedPage;
    } else {
      updated = await prisma.page.update({ where: { id: pageId }, data: dataToUpdate, select: pageDetailSelect });
    }

    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deletePage(request: FastifyRequest, reply: FastifyReply) {
    const { projectId, pageId } = request.params as { projectId: string; pageId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (!hasWriteAccess(authUser, access.membershipRole)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { id: true, projectId: true } });
    if (!page || page.projectId !== projectId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Page not found');
    }

    await prisma.page.delete({ where: { id: pageId } });

    return { success: true };
  }

  async reorderPages(request: FastifyRequest, reply: FastifyReply): Promise<PageSummary[] | void> {
    const { projectId } = request.params as { projectId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (!hasWriteAccess(authUser, access.membershipRole)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const { parentPageId, orderedPageIds } = (request.body ?? {}) as {
      parentPageId?: string | null;
      orderedPageIds?: string[];
    };

    if (!orderedPageIds || !Array.isArray(orderedPageIds) || orderedPageIds.length === 0) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'orderedPageIds is required');
    }

    const resolvedParentId = parentPageId ?? null;

    if (resolvedParentId) {
      if (orderedPageIds.includes(resolvedParentId)) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'A page cannot be its own parent');
      }
      const parent = await prisma.page.findUnique({ where: { id: resolvedParentId }, select: { id: true, projectId: true } });
      if (!parent || parent.projectId !== projectId) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Parent page must belong to the same project');
      }
    }

    const pagesToUpdate = await prisma.page.findMany({
      where: { id: { in: orderedPageIds }, projectId },
      select: { id: true, parentPageId: true },
    });

    if (pagesToUpdate.length !== orderedPageIds.length) {
      return sendError(reply, 400, 'VALIDATION_ERROR', 'One or more pages were not found in this project');
    }

    for (const page of pagesToUpdate) {
      if (resolvedParentId && page.parentPageId !== resolvedParentId && (await this.wouldCreateCycle(page.id, resolvedParentId))) {
        return sendError(reply, 400, 'VALIDATION_ERROR', 'Cannot move a page under itself or one of its own descendants');
      }
    }

    await prisma.$transaction(
      orderedPageIds.map((id, index) =>
        prisma.page.update({
          where: { id },
          data: { parentPageId: resolvedParentId, position: index, updatedById: authUser.id },
        }),
      ),
    );

    const pages = await prisma.page.findMany({
      where: { projectId },
      orderBy: [{ parentPageId: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        projectId: true,
        parentPageId: true,
        title: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: userMiniSelect },
        updatedBy: { select: userMiniSelect },
      },
    });

    return pages.map((page) => ({
      ...page,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
    }));
  }

  async listVersions(request: FastifyRequest, reply: FastifyReply): Promise<PageVersionSummary[] | void> {
    const { projectId, pageId } = request.params as { projectId: string; pageId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { id: true, projectId: true } });
    if (!page || page.projectId !== projectId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Page not found');
    }

    const versions = await prisma.pageVersion.findMany({
      where: { pageId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        pageId: true,
        title: true,
        createdAt: true,
        editedBy: { select: userMiniSelect },
      },
    });

    return versions.map((version) => ({ ...version, createdAt: version.createdAt.toISOString() }));
  }

  async getVersion(request: FastifyRequest, reply: FastifyReply): Promise<PageVersionDetail | void> {
    const { projectId, pageId, versionId } = request.params as { projectId: string; pageId: string; versionId: string };

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    const page = await prisma.page.findUnique({ where: { id: pageId }, select: { id: true, projectId: true } });
    if (!page || page.projectId !== projectId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Page not found');
    }

    const version = await prisma.pageVersion.findUnique({
      where: { id: versionId },
      select: {
        id: true,
        pageId: true,
        title: true,
        content: true,
        createdAt: true,
        editedBy: { select: userMiniSelect },
      },
    });

    if (!version || version.pageId !== pageId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Version not found');
    }

    return { ...version, createdAt: version.createdAt.toISOString() };
  }

  async restoreVersion(request: FastifyRequest, reply: FastifyReply): Promise<PageDetail | void> {
    const { projectId, pageId, versionId } = request.params as { projectId: string; pageId: string; versionId: string };
    const authUser = request.authUser as AuthenticatedUser;

    const access = await requireProjectAccess(request, reply, projectId);
    if (!access || reply.sent) return;

    if (!hasWriteAccess(authUser, access.membershipRole)) {
      return sendError(reply, 403, 'FORBIDDEN', 'Write access is required for this project');
    }

    const existing = await prisma.page.findUnique({ where: { id: pageId } });
    if (!existing || existing.projectId !== projectId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Page not found');
    }

    const version = await prisma.pageVersion.findUnique({ where: { id: versionId } });
    if (!version || version.pageId !== pageId) {
      return sendError(reply, 404, 'NOT_FOUND', 'Version not found');
    }

    const [, updatedPage] = await prisma.$transaction([
      prisma.pageVersion.create({
        data: {
          pageId,
          title: existing.title,
          content: existing.content,
          editedById: authUser.id,
        },
      }),
      prisma.page.update({
        where: { id: pageId },
        data: {
          title: version.title,
          content: version.content,
          updatedById: authUser.id,
        },
        select: pageDetailSelect,
      }),
    ]);

    return {
      ...updatedPage,
      createdAt: updatedPage.createdAt.toISOString(),
      updatedAt: updatedPage.updatedAt.toISOString(),
    };
  }
}
