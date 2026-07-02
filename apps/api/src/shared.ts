import type {
  AuthResponse,
  AuthenticatedUser,
  FolderMemberSummary,
  ProjectMembershipRole,
  ProjectMemberSummary,
  ScrumRole,
} from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';

// Add types declaration to ensure fastify knows about authUser
declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}

export type AccessTokenPayload = {
  role: AuthenticatedUser['platformRole'];
  sub: string;
};

export type RefreshTokenPayload = {
  sessionId: string;
  sub: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

export const uploadsDir = process.env.UPLOADS_DIR ?? 'storage/uploads';
export const accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? 'holocron-local-access-secret';
export const refreshTokenSecret = process.env.JWT_REFRESH_SECRET ?? 'holocron-local-refresh-secret';
export const accessTokenTtlMinutes = Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15);
export const refreshTokenTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
export const refreshCookieName = 'holocron_refresh_token';
export const isProduction = process.env.NODE_ENV === 'production';
export const allowedPlatformRoles = new Set<AuthenticatedUser['platformRole']>(['ADMIN', 'MEMBER']);
export const allowedProjectRoles = new Set<ProjectMembershipRole>(['MANAGER', 'CONTRIBUTOR', 'VIEWER']);
export const allowedScrumRoles = new Set<ScrumRole>(['DEVELOPER', 'PRODUCT_OWNER', 'SCRUM_MASTER']);

export function normalizeScrumRole(scrumRole: string | null | undefined): ScrumRole | null {
  if (!scrumRole) return null;
  return allowedScrumRoles.has(scrumRole as ScrumRole) ? (scrumRole as ScrumRole) : null;
}

const projectRoleRank: Record<ProjectMembershipRole, number> = {
  VIEWER: 1,
  CONTRIBUTOR: 2,
  MANAGER: 3,
};

export function compareProjectRoles(left: ProjectMembershipRole | null, right: ProjectMembershipRole | null) {
  if (!left) return right;
  if (!right) return left;
  return projectRoleRank[right] > projectRoleRank[left] ? right : left;
}

export function collectFolderAncestorIds(folderId: string | null, parentFolderById: Map<string, string | null>) {
  const ancestorIds = new Set<string>();
  const visited = new Set<string>();
  let currentFolderId = folderId;

  while (currentFolderId && !visited.has(currentFolderId)) {
    visited.add(currentFolderId);
    ancestorIds.add(currentFolderId);
    currentFolderId = parentFolderById.get(currentFolderId) ?? null;
  }

  return ancestorIds;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [algorithm, salt, expectedHash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }
  const candidateHash = scryptSync(password, salt, 64).toString('hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');
  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function expiresInSeconds(days: number) {
  return days * 24 * 60 * 60;
}

export function normalizePlatformRole(role: string): AuthenticatedUser['platformRole'] | null {
  return allowedPlatformRoles.has(role as AuthenticatedUser['platformRole'])
    ? (role as AuthenticatedUser['platformRole'])
    : null;
}

export function normalizeProjectRole(role: string): ProjectMembershipRole | null {
  return allowedProjectRoles.has(role as ProjectMembershipRole) ? (role as ProjectMembershipRole) : null;
}

export function buildAuthUser(user: { id: string; email: string; name: string; platformRole: string }) {
  const platformRole = normalizePlatformRole(user.platformRole);
  if (!platformRole) {
    throw new Error(`Unsupported platform role: ${user.platformRole}`);
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    platformRole,
  } satisfies AuthenticatedUser;
}

export function buildProjectMemberSummary(member: {
  role: string;
  scrumRole?: string | null;
  user: { id: string; email: string; name: string; platformRole: string };
}) {
  const role = normalizeProjectRole(member.role);
  const platformRole = normalizePlatformRole(member.user.platformRole);
  if (!role) {
    throw new Error(`Unsupported project role: ${member.role}`);
  }
  if (!platformRole) {
    throw new Error(`Unsupported platform role: ${member.user.platformRole}`);
  }
  return {
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    platformRole,
    role,
    scrumRole: normalizeScrumRole(member.scrumRole),
  } satisfies ProjectMemberSummary;
}

export function buildFolderMemberSummary(member: {
  role: string;
  user: { id: string; email: string; name: string; platformRole: string };
}) {
  const role = normalizeProjectRole(member.role);
  const platformRole = normalizePlatformRole(member.user.platformRole);
  if (!role) {
    throw new Error(`Unsupported folder role: ${member.role}`);
  }
  if (!platformRole) {
    throw new Error(`Unsupported platform role: ${member.user.platformRole}`);
  }
  return {
    userId: member.user.id,
    email: member.user.email,
    name: member.user.name,
    platformRole,
    role,
  } satisfies FolderMemberSummary;
}

export function createAccessToken(user: AuthenticatedUser) {
  return jwt.sign({ role: user.platformRole }, accessTokenSecret, {
    expiresIn: `${accessTokenTtlMinutes}m`,
    subject: user.id,
  });
}

export function createRefreshToken(sessionId: string, userId: string) {
  return jwt.sign({ sessionId }, refreshTokenSecret, {
    expiresIn: `${refreshTokenTtlDays}d`,
    subject: userId,
  });
}

export function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(refreshCookieName, token, {
    httpOnly: true,
    maxAge: expiresInSeconds(refreshTokenTtlDays),
    path: '/',
    sameSite: 'lax',
    secure: isProduction,
  });
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(refreshCookieName, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isProduction,
  });
}

export async function buildAuthResponse(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  const authUser = buildAuthUser(user);

  return {
    accessToken: createAccessToken(authUser),
    user: authUser,
  } satisfies AuthResponse;
}

export function sendError(reply: FastifyReply, statusCode: number, code: string, message: string) {
  return reply.code(statusCode).send({ error: { code, message } } satisfies ApiErrorBody);
}

export async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    sendError(reply, 401, 'UNAUTHORIZED', 'Missing bearer token');
    return;
  }
  let payload: AccessTokenPayload;
  try {
    payload = jwt.verify(header.slice(7), accessTokenSecret) as AccessTokenPayload;
  } catch {
    sendError(reply, 401, 'UNAUTHORIZED', 'Invalid access token');
    return;
  }
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      platformRole: true,
      isActive: true,
    },
  });
  if (!user || !user.isActive) {
    sendError(reply, 401, 'UNAUTHORIZED', 'User is not active');
    return;
  }
  request.authUser = buildAuthUser(user);
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticateRequest(request, reply);
  if (reply.sent) {
    return;
  }
  if (request.authUser?.platformRole !== 'ADMIN') {
    sendError(reply, 403, 'FORBIDDEN', 'Admin access is required');
  }
}

export async function requireProjectAccess(request: FastifyRequest, reply: FastifyReply, projectId: string) {
  const authUser = request.authUser;
  if (!authUser) {
    sendError(reply, 401, 'UNAUTHORIZED', 'Authentication is required');
    return;
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, folderId: true },
  });
  if (!project) {
    sendError(reply, 404, 'NOT_FOUND', 'Project not found');
    return;
  }
  if (authUser.platformRole === 'ADMIN') {
    return {
      membershipRole: null,
      projectId: project.id,
    };
  }
  const [directMembership, folderMemberships, folders] = await Promise.all([
    prisma.projectMembership.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: authUser.id,
        },
      },
      select: {
        role: true,
      },
    }),
    prisma.folderMembership.findMany({
      where: {
        userId: authUser.id,
      },
      select: {
        folderId: true,
        role: true,
      },
    }),
    prisma.folder.findMany({
      select: {
        id: true,
        parentFolderId: true,
      },
    }),
  ]);

  const folderMembershipRoleById = new Map<string, ProjectMembershipRole>();
  for (const membership of folderMemberships) {
    const role = normalizeProjectRole(membership.role);
    if (!role) {
      throw new Error(`Unsupported folder role: ${membership.role}`);
    }
    folderMembershipRoleById.set(membership.folderId, role);
  }

  const folderParentById = new Map(folders.map((folder) => [folder.id, folder.parentFolderId] as const));
  const ancestorFolderIds = collectFolderAncestorIds(project.folderId, folderParentById);

  let membershipRole = directMembership ? normalizeProjectRole(directMembership.role) : null;
  if (directMembership && !membershipRole) {
    throw new Error(`Unsupported project role: ${directMembership.role}`);
  }

  for (const ancestorFolderId of ancestorFolderIds) {
    membershipRole = compareProjectRoles(membershipRole, folderMembershipRoleById.get(ancestorFolderId) ?? null);
  }

  if (!membershipRole) {
    sendError(reply, 403, 'FORBIDDEN', 'You do not have access to this project');
    return;
  }
  return {
    membershipRole,
    projectId: project.id,
  };
}

export async function requireProjectManagerAccess(request: FastifyRequest, reply: FastifyReply, projectId: string) {
  const access = await requireProjectAccess(request, reply, projectId);
  if (!access || reply.sent) {
    return;
  }
  if (request.authUser?.platformRole === 'ADMIN' || access.membershipRole === 'MANAGER') {
    return access;
  }
  sendError(reply, 403, 'FORBIDDEN', 'Manager access is required for this project');
}
