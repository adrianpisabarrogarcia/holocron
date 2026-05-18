import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import type {
  AuthResponse,
  AuthenticatedUser,
  HealthResponse,
  ProjectMemberSummary,
  ProjectMembershipRole,
  ProjectSummary,
  TaskSummary,
  UpsertProjectMemberInput,
} from '@holocron/contracts';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { mkdirSync } from 'node:fs';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import jwt from 'jsonwebtoken';
import { ensureSeedData, prisma } from '@holocron/db';

declare module 'fastify' {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}

type AccessTokenPayload = {
  role: AuthenticatedUser['platformRole'];
  sub: string;
};

type RefreshTokenPayload = {
  sessionId: string;
  sub: string;
};

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
  };
};

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
const host = '0.0.0.0';
const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
const uploadsDir = process.env.UPLOADS_DIR ?? resolve(process.cwd(), 'storage/uploads');
const accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? 'holocron-local-access-secret';
const refreshTokenSecret = process.env.JWT_REFRESH_SECRET ?? 'holocron-local-refresh-secret';
const accessTokenTtlMinutes = Number(process.env.ACCESS_TOKEN_TTL_MINUTES ?? 15);
const refreshTokenTtlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 7);
const refreshCookieName = 'holocron_refresh_token';
const isProduction = process.env.NODE_ENV === 'production';
const allowedPlatformRoles = new Set<AuthenticatedUser['platformRole']>(['ADMIN', 'MEMBER']);
const allowedProjectRoles = new Set<ProjectMembershipRole>(['MANAGER', 'CONTRIBUTOR', 'VIEWER']);

mkdirSync(uploadsDir, { recursive: true });

const app = Fastify({ logger: true });

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');

  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string) {
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

function hashRefreshToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function expiresInSeconds(days: number) {
  return days * 24 * 60 * 60;
}

function normalizePlatformRole(role: string): AuthenticatedUser['platformRole'] | null {
  return allowedPlatformRoles.has(role as AuthenticatedUser['platformRole'])
    ? (role as AuthenticatedUser['platformRole'])
    : null;
}

function normalizeProjectRole(role: string): ProjectMembershipRole | null {
  return allowedProjectRoles.has(role as ProjectMembershipRole) ? (role as ProjectMembershipRole) : null;
}

function buildAuthUser(user: { id: string; email: string; name: string; platformRole: string }) {
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

function buildProjectMemberSummary(member: {
  role: string;
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
  } satisfies ProjectMemberSummary;
}

async function requireProjectAccess(request: FastifyRequest, reply: FastifyReply, projectId: string) {
  const authUser = request.authUser;

  if (!authUser) {
    sendError(reply, 401, 'UNAUTHORIZED', 'Authentication is required');
    return;
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
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

  const membership = await prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: authUser.id,
      },
    },
    select: {
      role: true,
    },
  });

  if (!membership) {
    sendError(reply, 403, 'FORBIDDEN', 'You do not have access to this project');
    return;
  }

  const membershipRole = normalizeProjectRole(membership.role);

  if (!membershipRole) {
    throw new Error(`Unsupported project role: ${membership.role}`);
  }

  return {
    membershipRole,
    projectId: project.id,
  };
}

async function requireProjectManagerAccess(request: FastifyRequest, reply: FastifyReply, projectId: string) {
  const access = await requireProjectAccess(request, reply, projectId);

  if (!access || reply.sent) {
    return;
  }

  if (request.authUser?.platformRole === 'ADMIN' || access.membershipRole === 'MANAGER') {
    return access;
  }

  sendError(reply, 403, 'FORBIDDEN', 'Manager access is required for this project');
}

function createAccessToken(user: AuthenticatedUser) {
  return jwt.sign({ role: user.platformRole }, accessTokenSecret, {
    expiresIn: `${accessTokenTtlMinutes}m`,
    subject: user.id,
  });
}

function createRefreshToken(sessionId: string, userId: string) {
  return jwt.sign({ sessionId }, refreshTokenSecret, {
    expiresIn: `${refreshTokenTtlDays}d`,
    subject: userId,
  });
}

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(refreshCookieName, token, {
    httpOnly: true,
    maxAge: expiresInSeconds(refreshTokenTtlDays),
    path: '/',
    sameSite: 'lax',
    secure: isProduction,
  });
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(refreshCookieName, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: isProduction,
  });
}

function sendError(reply: FastifyReply, statusCode: number, code: string, message: string) {
  return reply.code(statusCode).send({ error: { code, message } } satisfies ApiErrorBody);
}

async function createSession(userId: string, refreshToken: string, request: FastifyRequest) {
  const expiresAt = new Date(Date.now() + expiresInSeconds(refreshTokenTtlDays) * 1000);

  return prisma.userSession.create({
    data: {
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      expiresAt,
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      ipAddress: request.ip,
    },
  });
}

async function buildAuthResponse(userId: string) {
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

async function authenticateRequest(request: FastifyRequest, reply: FastifyReply) {
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

async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  await authenticateRequest(request, reply);

  if (reply.sent) {
    return;
  }

  if (request.authUser?.platformRole !== 'ADMIN') {
    sendError(reply, 403, 'FORBIDDEN', 'Admin access is required');
  }
}

await app.register(cors, {
  credentials: true,
  origin: corsOrigin,
});

await app.register(cookie);

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error);

  if (reply.sent) {
    return;
  }

  sendError(reply, 500, 'INTERNAL_ERROR', 'Unexpected server error');
});

app.get('/health', async (): Promise<HealthResponse> => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    status: 'ok',
  };
});

app.post('/auth/login', async (request, reply): Promise<AuthResponse | void> => {
  const { email, password } = (request.body ?? {}) as { email?: string; password?: string };

  if (!email || !password) {
    return sendError(reply, 400, 'INVALID_CREDENTIALS', 'Email and password are required');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      platformRole: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
    return sendError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const authUser = buildAuthUser(user);
  const sessionSeed = randomBytes(32).toString('hex');
  const provisionalSession = await createSession(user.id, sessionSeed, request);
  const refreshToken = createRefreshToken(provisionalSession.id, user.id);

  await prisma.userSession.update({
    where: { id: provisionalSession.id },
    data: { refreshTokenHash: hashRefreshToken(refreshToken) },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  setRefreshCookie(reply, refreshToken);

  return {
    accessToken: createAccessToken(authUser),
    user: authUser,
  };
});

app.post('/auth/refresh', async (request, reply): Promise<AuthResponse | void> => {
  const refreshToken = request.cookies[refreshCookieName];

  if (!refreshToken) {
    clearRefreshCookie(reply);
    return sendError(reply, 401, 'UNAUTHORIZED', 'Refresh token is missing');
  }

  let payload: RefreshTokenPayload;

  try {
    payload = jwt.verify(refreshToken, refreshTokenSecret) as RefreshTokenPayload;
  } catch {
    clearRefreshCookie(reply);
    return sendError(reply, 401, 'UNAUTHORIZED', 'Invalid refresh token');
  }

  const session = await prisma.userSession.findUnique({
    where: { id: payload.sessionId },
    select: {
      id: true,
      userId: true,
      refreshTokenHash: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!session || session.userId !== payload.sub || session.revokedAt || session.expiresAt <= new Date()) {
    clearRefreshCookie(reply);
    return sendError(reply, 401, 'UNAUTHORIZED', 'Refresh session is no longer valid');
  }

  if (session.refreshTokenHash !== hashRefreshToken(refreshToken)) {
    await prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    clearRefreshCookie(reply);
    return sendError(reply, 401, 'UNAUTHORIZED', 'Refresh token mismatch');
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  const nextSession = await prisma.userSession.create({
    data: {
      userId: session.userId,
      refreshTokenHash: hashRefreshToken(randomBytes(32).toString('hex')),
      expiresAt: new Date(Date.now() + expiresInSeconds(refreshTokenTtlDays) * 1000),
      userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
      ipAddress: request.ip,
    },
  });
  const nextRefreshToken = createRefreshToken(nextSession.id, session.userId);

  await prisma.userSession.update({
    where: { id: nextSession.id },
    data: { refreshTokenHash: hashRefreshToken(nextRefreshToken) },
  });

  const authResponse = await buildAuthResponse(session.userId);

  if (!authResponse) {
    clearRefreshCookie(reply);
    return sendError(reply, 401, 'UNAUTHORIZED', 'User is not active');
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { lastLoginAt: new Date() },
  });

  setRefreshCookie(reply, nextRefreshToken);
  return authResponse;
});

app.post('/auth/logout', async (request, reply) => {
  const refreshToken = request.cookies[refreshCookieName];

  if (refreshToken) {
    await prisma.userSession.updateMany({
      where: {
        refreshTokenHash: hashRefreshToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  clearRefreshCookie(reply);
  return { success: true };
});

app.get('/auth/me', { preHandler: authenticateRequest }, async (request) => request.authUser as AuthenticatedUser);

app.post('/admin/users', { preHandler: requireAdmin }, async (request, reply): Promise<AuthenticatedUser | void> => {
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
});

app.get('/api/projects', { preHandler: authenticateRequest }, async (request): Promise<ProjectSummary[]> => {
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
  }));
});

app.get('/api/projects/:projectId/tasks', { preHandler: authenticateRequest }, async (request, reply): Promise<TaskSummary[] | void> => {
  const { projectId } = request.params as { projectId: string };

  const access = await requireProjectAccess(request, reply, projectId);

  if (!access || reply.sent) {
    return;
  }

  return prisma.task.findMany({
    where: { projectId },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
    },
  }).then((tasks) =>
    tasks.map((task) => ({
      ...task,
      status: task.status as TaskSummary['status'],
      priority: task.priority as TaskSummary['priority'],
    })),
  );
});

app.get('/api/projects/:projectId/members', { preHandler: authenticateRequest }, async (request, reply): Promise<ProjectMemberSummary[] | void> => {
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
});

app.post('/api/projects/:projectId/members', { preHandler: requireAdmin }, async (request, reply): Promise<ProjectMemberSummary | void> => {
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
});

await ensureSeedData();
await app.listen({ port, host });
