import { prisma } from '@holocron/db';
import nodemailer from 'nodemailer';

export const emailConfig = {
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: Number(process.env.SMTP_PORT ?? 465),
  smtpSecure: process.env.SMTP_SECURE !== 'false', // Default true (use SSL for port 465)
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  fromEmail: process.env.EMAIL_FROM || process.env.SMTP_USER || 'notifications@holocron.local',
  fromName: process.env.EMAIL_FROM_NAME || 'Holocron',
  appUrl: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

export class EmailService {
  private static async sendEmail(to: string | string[], subject: string, html: string, text: string) {
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length === 0) return;

    if (!emailConfig.smtpUser || !emailConfig.smtpPass) {
      console.log(`
============================================================
[EMAIL LOG (SMTP MOCK)]
To: ${recipients.join(', ')}
From: "${emailConfig.fromName}" <${emailConfig.fromEmail}>
Subject: ${subject}
------------------------------------------------------------
TEXT VERSION:
${text}
------------------------------------------------------------
HTML VERSION:
${html}
============================================================
`);
      return;
    }

    try {
      const transporter = nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpSecure,
        auth: {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
        to: recipients.join(', '),
        subject,
        text,
        html,
      });

      console.log(`[EMAIL SUCCESS] Email sent via SMTP:`, info.messageId);
    } catch (err) {
      console.error('[EMAIL ERROR] Exception thrown while sending email via SMTP:', err);
    }
  }

  private static async shouldNotifyUser(userId: string, projectId: string, eventField: keyof import('@prisma/client').NotificationPreference): Promise<boolean> {
    const projectPref = await prisma.projectNotificationPreference.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });
    if (projectPref && (projectPref as any)[eventField] !== null) {
      return (projectPref as any)[eventField] as boolean;
    }
    const globalPref = await prisma.notificationPreference.findUnique({
      where: { userId }
    });
    if (globalPref && (globalPref as any)[eventField] !== null) {
      return (globalPref as any)[eventField] as boolean;
    }
    return true;
  }

  static async sendTaskCreatedEmail(
    task: { id: string; title: string; description: string | null; owners: Array<{ id: string; email: string; name: string }>; assignees: Array<{ id: string; email: string; name: string }> },
    creator: { id: string; name: string }
  ) {
    const project = await prisma.project.findFirst({
      where: { tasks: { some: { id: task.id } } },
      select: { 
        name: true, 
        id: true,
        workspace: { select: { slug: true } }
      }
    });

    const projectName = project?.name ?? 'Proyecto';
    const workspaceSlug = project?.workspace.slug ?? 'default';
    const actionUrl = project 
      ? `${emailConfig.appUrl}/workspace/${workspaceSlug}/board?project=${project.id}&task=${task.id}` 
      : `${emailConfig.appUrl}/board`;
    
    if (!project) return;

    const participantEmails = new Set<string>();
    
    for (const p of [...task.owners, ...task.assignees]) {
      if (p.id === creator.id) continue;
      if (await this.shouldNotifyUser(p.id, project.id, 'onTaskAssigned')) {
        participantEmails.add(p.email);
      }
    }

    if (participantEmails.size === 0) return;

    const subject = `🆕 Nueva Tarea: "${task.title}" en ${projectName}`;
    
    const plainDesc = task.description ? task.description.replace(/<[^>]*>/g, '') : 'Sin descripción';
    const text = `Hola,\n\nSe ha creado una nueva tarea en Holocron.\n\nProyecto: ${projectName}\nTarea: ${task.title}\nCreada por: ${creator.name}\n\nDescripción:\n${plainDesc}\n\nVer tablero: ${actionUrl}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
          .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
          .content { padding: 28px 24px; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 20px; }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .details-table td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
          .details-table td.label { font-weight: 600; color: #64748b; width: 100px; }
          .details-table td.value { color: #1e293b; }
          .desc-box { background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 8px; padding: 14px; margin-bottom: 24px; font-size: 13px; line-height: 1.5; color: #334155; }
          .desc-box h4 { margin-top: 0; margin-bottom: 6px; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn { background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <h1>Holocron Workspace</h1>
            </div>
            <div class="content">
              <h3 class="title">Se ha creado una nueva tarea en tu proyecto</h3>
              <table class="details-table">
                <tr>
                  <td class="label">Proyecto:</td>
                  <td class="value">${projectName}</td>
                </tr>
                <tr>
                  <td class="label">Tarea:</td>
                  <td class="value" style="font-weight: bold; color: #4f46e5;">${task.title}</td>
                </tr>
                <tr>
                  <td class="label">Creada por:</td>
                  <td class="value">${creator.name}</td>
                </tr>
              </table>
              <div class="desc-box">
                <h4>Descripción de la tarea:</h4>
                <div>${task.description || '<i>Sin descripción</i>'}</div>
              </div>
              <div class="btn-container">
                <a href="${actionUrl}" class="btn" target="_blank">Ver Tablero de Tareas</a>
              </div>
            </div>
            <div class="footer">
              Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(Array.from(participantEmails), subject, html, text);
  }

  static async sendTaskAssignedEmail(
    task: { id: string; title: string },
    projectId: string,
    assignee: { id: string; name: string; email: string },
    assigner: { id: string; name: string }
  ) {
    if (assignee.id === assigner.id) return;
    if (!(await this.shouldNotifyUser(assignee.id, projectId, 'onTaskAssigned'))) return;
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspace: { select: { slug: true } } }
    });
    const workspaceSlug = project?.workspace.slug ?? 'default';
    const subject = `📌 Asignación: "${task.title}"`;
    const actionUrl = `${emailConfig.appUrl}/workspace/${workspaceSlug}/board?project=${projectId}&task=${task.id}`;
    const text = `Hola ${assignee.name},\n\n${assigner.name} te ha asignado a la tarea: "${task.title}".\n\nVer tarea: ${actionUrl}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
          .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
          .content { padding: 28px 24px; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          .highlight-box { background-color: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 18px; font-weight: bold; font-size: 15px; color: #4338ca; text-align: center; margin: 20px 0; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn { background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <h1>Holocron Workspace</h1>
            </div>
            <div class="content">
              <h3 class="title">Hola ${assignee.name},</h3>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                <strong>${assigner.name}</strong> te ha asignado a la siguiente tarea:
              </p>
              <div class="highlight-box">
                "${taskTitle}"
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                Accede al tablero de Holocron para ver los detalles y organizar tu jornada.
              </p>
              <div class="btn-container">
                <a href="${actionUrl}" class="btn" target="_blank">Ir a Mis Tareas</a>
              </div>
            </div>
            <div class="footer">
              Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(assignee.email, subject, html, text);
  }

  static async sendSprintClosedEmail(
    sprintName: string,
    projectId: string,
    closer: { name: string }
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, workspace: { select: { slug: true } }, memberships: { select: { user: { select: { email: true, name: true } } } } }
    });

    if (!project) return;
    const projectName = project.name;
    const emails = project.memberships.map(m => m.user.email);
    if (emails.length === 0) return;

    const workspaceSlug = project.workspace.slug;
    const actionUrl = `${emailConfig.appUrl}/workspace/${workspaceSlug}/sprints?project=${projectId}`;
    const subject = `🎉 Hito/Sprint Cerrado: "${sprintName}" en ${projectName}`;
    const text = `Hola,\n\nEl sprint/hito "${sprintName}" en el proyecto "${projectName}" ha sido cerrado por ${closer.name}.\n\n¡Buen trabajo equipo!\n\nVer sprints: ${actionUrl}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
          .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
          .content { padding: 28px 24px; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          .success-box { background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 18px; font-weight: bold; font-size: 15px; color: #065f46; text-align: center; margin: 20px 0; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn { background-color: #10b981; color: #ffffff !important; padding: 12px 24px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <h1>Sprint Completado</h1>
            </div>
            <div class="content">
              <h3 class="title">¡Buen trabajo, equipo!</h3>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                El sprint o hito de proyecto ha sido completado y cerrado por <strong>${closer.name}</strong>:
              </p>
              <div class="success-box">
                "${sprintName}"
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                Proyecto: <strong>${projectName}</strong>
              </p>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                Accede a Holocron para revisar las métricas y empezar a planificar el próximo ciclo.
              </p>
              <div class="btn-container">
                <a href="${actionUrl}" class="btn" target="_blank">Ver Sprints / Hitos</a>
              </div>
            </div>
            <div class="footer">
              Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(emails, subject, html, text);
  }

  static async handleCommentMentions(
    commentContent: string,
    task: { id: string; title: string },
    projectId: string,
    commenter: { name: string }
  ) {
    const matches = commentContent.match(/@([a-zA-Z0-9_À-ÿ\s\.\-\@]+)/g);
    if (!matches) return;

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    });

    const mentionedUsers = new Set<string>();

    for (const match of matches) {
      const potentialName = match.substring(1).trim().toLowerCase();
      
      for (const u of users) {
        if (u.name.toLowerCase().includes(potentialName) || u.email.toLowerCase().includes(potentialName)) {
          mentionedUsers.add(JSON.stringify({ name: u.name, email: u.email }));
        }
      }
    }

    for (const serialized of mentionedUsers) {
      const u = JSON.parse(serialized) as { name: string; email: string };
      this.sendMentionEmail(task, projectId, u, commenter, commentContent).catch(err => {
        console.error('[EMAIL ERROR] Failed to send mention email:', err);
      });
    }
  }

  static async sendMentionEmail(
    task: { id: string; title: string },
    projectId: string,
    mentionedUser: { name: string; email: string },
    commenter: { name: string },
    commentContent: string
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspace: { select: { slug: true } } }
    });
    const workspaceSlug = project?.workspace.slug ?? 'default';
    const subject = `💬 Mención: "${task.title}"`;
    const actionUrl = `${emailConfig.appUrl}/workspace/${workspaceSlug}/board?project=${projectId}&task=${task.id}`;
    const cleanComment = commentContent.replace(/<[^>]*>/g, '');
    const text = `Hola ${mentionedUser.name},\n\n${commenter.name} te ha mencionado en un comentario dentro de la tarea "${task.title}":\n\n"${cleanComment}"\n\nVer conversación: ${actionUrl}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
          .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
          .content { padding: 28px 24px; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          .comment-box { background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; line-height: 1.5; color: #334155; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn { background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <h1>Mención en Holocron</h1>
            </div>
            <div class="content">
              <h3 class="title">Hola ${mentionedUser.name},</h3>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                <strong>${commenter.name}</strong> te ha mencionado en un comentario dentro de la tarea:
              </p>
              <div class="comment-box">
                ${commentContent}
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                Entra a Holocron para responder y seguir la conversación.
              </p>
              <div class="btn-container">
                <a href="${actionUrl}" class="btn" target="_blank">Ver Conversación</a>
              </div>
            </div>
            <div class="footer">
              Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(mentionedUser.email, subject, html, text);
  }

  static async sendTaskBlockedEmail(
    task: { id: string; title: string; blockedReason: string | null; owners: Array<{ id: string; email: string; name: string }>; assignees: Array<{ id: string; email: string; name: string }> },
    blocker: { id: string; name: string },
    projectId: string
  ) {
    const participantEmails = new Set<string>();
    
    for (const p of [...task.owners, ...task.assignees]) {
      if (p.id === blocker.id) continue;
      if (await this.shouldNotifyUser(p.id, projectId, 'onTaskStatusChanged')) {
        participantEmails.add(p.email);
      }
    }

    if (participantEmails.size === 0) return;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspace: { select: { slug: true } } }
    });
    const workspaceSlug = project?.workspace.slug ?? 'default';
    const actionUrl = `${emailConfig.appUrl}/workspace/${workspaceSlug}/board?project=${projectId}&task=${task.id}`;
    const subject = `⚠️ Tarea Bloqueada: "${task.title}"`;
    const text = `Hola,\n\nLa tarea "${task.title}" ha sido marcada como BLOQUEADA por ${blocker.name}.\n\nMotivo del bloqueo:\n${task.blockedReason || 'Sin motivo especificado'}\n\nVer tarea: ${actionUrl}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
          .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
          .content { padding: 28px 24px; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          .warning-box { background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px; margin: 20px 0; font-size: 13px; line-height: 1.5; color: #991b1b; }
          .warning-box h4 { margin-top: 0; margin-bottom: 6px; color: #991b1b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
          .btn-container { text-align: center; margin: 24px 0 10px 0; }
          .btn { background-color: #ef4444; color: #ffffff !important; padding: 12px 24px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <h1>⚠️ Tarea Bloqueada</h1>
            </div>
            <div class="content">
              <h3 class="title">Atención requerida</h3>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                La tarea <strong>"${task.title}"</strong> ha sido marcada como <strong>BLOQUEADA</strong> por <strong>${blocker.name}</strong>.
              </p>
              <div class="warning-box">
                <h4>Motivo del bloqueo:</h4>
                <div>${task.blockedReason || 'Sin motivo especificado'}</div>
              </div>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                Por favor, revisa el tablero para coordinar y desbloquear el trabajo.
              </p>
              <div class="btn-container">
                <a href="${actionUrl}" class="btn" target="_blank">Ver Tarea Bloqueada</a>
              </div>
            </div>
            <div class="footer">
              Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(Array.from(participantEmails), subject, html, text);
  }

  static async sendMagicLinkEmail(email: string, name: string, link: string) {
    const subject = `🔑 Enlace de Acceso a Holocron`;
    const text = `Hola ${name},\n\nPara iniciar sesión en Holocron, haz clic en el siguiente enlace (válido por 15 minutos):\n\n${link}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 0; }
          .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; box-sizing: border-box; }
          .card { max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 24px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 18px; font-weight: 800; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
          .content { padding: 28px 24px; text-align: center; }
          .title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background-color: #4f46e5; color: #ffffff !important; padding: 12px 28px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 8px; display: inline-block; }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="card">
            <div class="header">
              <h1>Holocron Workspace</h1>
            </div>
            <div class="content">
              <h3 class="title">Iniciar Sesión</h3>
              <p style="font-size: 13px; line-height: 1.5; color: #475569;">
                Hola <strong>${name}</strong>, para acceder de forma segura a tu cuenta de Holocron, haz clic en el siguiente botón. El enlace es válido durante 15 minutos.
              </p>
              <div class="btn-container">
                <a href="${link}" class="btn" target="_blank">Iniciar Sesión en Holocron</a>
              </div>
              <p style="font-size: 11px; color: #64748b; line-height: 1.4; word-break: break-all;">
                Si el botón no funciona, copia y pega esta URL en tu navegador:<br>
                <a href="${link}" style="color: #4f46e5;">${link}</a>
              </p>
            </div>
            <div class="footer">
              Si no has solicitado este enlace, puedes ignorar este correo de forma segura.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.sendEmail(email, subject, html, text);
  }
}
