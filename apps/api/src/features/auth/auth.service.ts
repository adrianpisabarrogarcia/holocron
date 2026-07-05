import type { AuthResponse, AuthenticatedUser } from '@holocron/contracts';
import { prisma } from '@holocron/db';
import { EmailService, emailConfig } from '../email/email.service';
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
  refreshTokenTtlHours,
  setRefreshCookie,
  clearRefreshCookie,
  sendError,
  refreshCookieName,
  refreshTokenSecret,
  buildAuthResponse,
  buildAuthUser,
} from '../../shared';

export class AuthService {
  async login(request: FastifyRequest, reply: FastifyReply): Promise<{ success: boolean; message: string } | void> {
    const { email } = (request.body ?? {}) as { email?: string };

    if (!email) {
      return sendError(reply, 400, 'INVALID_CREDENTIALS', 'El correo electrónico es obligatorio');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    // To prevent user enumeration, we always return the same message
    const successResponse = {
      success: true,
      message: 'Si tu dirección de correo electrónico existe en nuestro sistema, recibirás un enlace de acceso en unos minutos.'
    };

    if (user && user.isActive) {
      // Generate short-lived (5 minutes) magic link token signed with refreshTokenSecret
      const magicToken = jwt.sign(
        { email: user.email },
        refreshTokenSecret,
        { expiresIn: '5m' }
      );

      const callbackUrl = `${emailConfig.appUrl}/login/callback?token=${magicToken}`;
      
      // Send magic link email in background
      EmailService.sendMagicLinkEmail(user.email, user.name, callbackUrl).catch(err => {
        console.error('[EMAIL ERROR] Failed to send magic link email:', err);
      });
    }

    return successResponse;
  }

  async magicLogin(request: FastifyRequest, reply: FastifyReply): Promise<AuthResponse | void> {
    const { token } = (request.body ?? {}) as { token?: string };

    if (!token) {
      return sendError(reply, 400, 'INVALID_TOKEN', 'El token de acceso es obligatorio');
    }

    let payload: { email: string };
    try {
      payload = jwt.verify(token, refreshTokenSecret) as { email: string };
    } catch {
      return sendError(reply, 401, 'INVALID_TOKEN', 'El enlace de acceso ha expirado o es inválido');
    }

    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        isActive: true,
        avatarUrl: true,
      },
    });

    if (!user || !user.isActive) {
      return sendError(reply, 401, 'INVALID_TOKEN', 'El usuario no está activo o no existe');
    }

    const authUser = buildAuthUser(user);
    const sessionSeed = randomBytes(32).toString('hex');
    const provisionalSession = await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashRefreshToken(sessionSeed),
        expiresAt: new Date(Date.now() + expiresInSeconds(refreshTokenTtlHours) * 1000),
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
        expiresAt: new Date(Date.now() + expiresInSeconds(refreshTokenTtlHours) * 1000),
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
