import type { AuthResponse, AuthenticatedUser } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import {
  verifyPassword,
  hashPassword,
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  expiresInSeconds,
  refreshTokenTtlDays,
  setRefreshCookie,
  clearRefreshCookie,
  sendError,
  refreshCookieName,
  refreshTokenSecret,
  buildAuthResponse,
  buildAuthUser,
} from '../../shared';

export class AuthService {
  async login(request: FastifyRequest, reply: FastifyReply): Promise<AuthResponse | void> {
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
        avatarUrl: true,
      },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      return sendError(reply, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const authUser = buildAuthUser(user);
    const sessionSeed = randomBytes(32).toString('hex');
    const provisionalSession = await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(sessionSeed),
        expiresAt: new Date(Date.now() + expiresInSeconds(refreshTokenTtlDays) * 1000),
        userAgent: typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null,
        ipAddress: request.ip,
      },
    });
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
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<AuthResponse | void> {
    const refreshToken = request.cookies[refreshCookieName];

    if (!refreshToken) {
      clearRefreshCookie(reply);
      return sendError(reply, 401, 'UNAUTHORIZED', 'Refresh token is missing');
    }

    let payload: { sessionId: string; sub: string };

    try {
      payload = jwt.verify(refreshToken, refreshTokenSecret) as { sessionId: string; sub: string };
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
  }

  async logout(request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean }> {
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
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply): Promise<AuthenticatedUser | void> {
    const authUser = request.authUser as AuthenticatedUser;
    const { name, avatarUrl, password } = (request.body ?? {}) as { name?: string; avatarUrl?: string | null; password?: string };

    const data: any = {};
    if (name) data.name = name;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (password) data.passwordHash = hashPassword(password);

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        avatarUrl: true,
      }
    });

    return buildAuthUser(updated);
  }
}
