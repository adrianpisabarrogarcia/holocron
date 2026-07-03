import { prisma } from '@holocron/db';

export const emailConfig = {
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  fromEmail: process.env.EMAIL_FROM || 'notifications@holocron.local',
  fromName: process.env.EMAIL_FROM_NAME || 'Holocron Notifications',
};

export class EmailService {
  private static async sendEmail(to: string | string[], subject: string, html: string, text: string) {
    const recipients = Array.isArray(to) ? to : [to];
    if (recipients.length === 0) return;

    if (!emailConfig.apiToken || !emailConfig.accountId) {
      console.log(`
============================================================
[EMAIL LOG (MOCK)]
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
      const url = `https://api.cloudflare.com/client/v4/accounts/${emailConfig.accountId}/email/sending/send`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailConfig.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: recipients,
          from: { address: emailConfig.fromEmail, name: emailConfig.fromName },
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[EMAIL ERROR] Failed to send email via Cloudflare: ${response.status} - ${errText}`);
      } else {
        const resJson = await response.json();
        console.log(`[EMAIL SUCCESS] Email sent successfully via Cloudflare:`, resJson);
      }
    } catch (err) {
      console.error('[EMAIL ERROR] Exception thrown while sending email:', err);
    }
  }

  static async sendTaskCreatedEmail(
    task: { id: string; title: string; description: string | null; owners: Array<{ email: string; name: string }>; assignees: Array<{ email: string; name: string }> },
    creator: { name: string }
  ) {
    const project = await prisma.project.findFirst({
      where: { tasks: { some: { id: task.id } } },
      select: { name: true, id: true }
    });

    const projectName = project?.name ?? 'Proyecto';
    
    // Collect all unique participant emails
    const participantEmails = new Set<string>();
    task.owners.forEach(o => participantEmails.add(o.email));
    task.assignees.forEach(a => participantEmails.add(a.email));

    if (participantEmails.size === 0) return;

    const subject = `Nueva Tarea Creada: "${task.title}" en ${projectName}`;
    
    const plainDesc = task.description ? task.description.replace(/<[^>]*>/g, '') : 'Sin descripción';
    const text = `Hola,\n\nSe ha creado una nueva tarea en Holocron.\n\nProyecto: ${projectName}\nTarea: ${task.title}\nCreada por: ${creator.name}\n\nDescripción:\n${plainDesc}\n\nAccede a Holocron para ver los detalles.`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Nueva Tarea en Holocron</h2>
        <p>Se ha creado una nueva tarea en tu proyecto:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4a5568; width: 120px;">Proyecto:</td>
            <td style="padding: 8px 0; color: #1a202c;">${projectName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Tarea:</td>
            <td style="padding: 8px 0; color: #1a202c; font-weight: bold;">${task.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4a5568;">Creada por:</td>
            <td style="padding: 8px 0; color: #1a202c;">${creator.name}</td>
          </tr>
        </table>
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px 0; color: #4a5568;">Descripción:</h4>
          <div style="color: #2d3748; font-size: 14px; line-height: 1.5;">${task.description || '<i>Sin descripción</i>'}</div>
        </div>
        <p style="font-size: 12px; color: #a0aec0; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
        </p>
      </div>
    `;

    await this.sendEmail(Array.from(participantEmails), subject, html, text);
  }

  static async sendTaskAssignedEmail(
    taskTitle: string,
    assignee: { name: string; email: string },
    assigner: { name: string }
  ) {
    const subject = `Te han asignado una tarea: "${taskTitle}"`;
    const text = `Hola ${assignee.name},\n\n${assigner.name} te ha asignado a la tarea: "${taskTitle}".\n\nEntra en Holocron para gestionar tu trabajo.`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #4f46e5; margin-top: 0;">Asignación de Tarea</h2>
        <p>Hola <strong>${assignee.name}</strong>,</p>
        <p><strong>${assigner.name}</strong> te ha asignado a la siguiente tarea:</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; font-weight: bold; font-size: 16px; color: #1e293b; border: 1px solid #e2e8f0; text-align: center; margin: 20px 0;">
          "${taskTitle}"
        </div>
        <p>Accede al tablero de Holocron para ver los detalles y empezar a trabajar.</p>
        <p style="font-size: 12px; color: #a0aec0; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
        </p>
      </div>
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
      select: { name: true, memberships: { select: { user: { select: { email: true, name: true } } } } }
    });

    if (!project) return;
    const projectName = project.name;
    const emails = project.memberships.map(m => m.user.email);
    if (emails.length === 0) return;

    const subject = `Milestone/Sprint Cerrado: "${sprintName}" en ${projectName}`;
    const text = `Hola,\n\nEl hito/sprint "${sprintName}" en el proyecto "${projectName}" ha sido cerrado por ${closer.name}.\n\n¡Buen trabajo equipo!`;
    
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #10b981; margin-top: 0;">🎉 ¡Hito/Sprint Cerrado!</h2>
        <p>Hola equipo,</p>
        <p>El sprint/hito <strong>"${sprintName}"</strong> en el proyecto <strong>${projectName}</strong> ha sido completado y cerrado por <strong>${closer.name}</strong>.</p>
        <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; font-weight: bold; font-size: 16px; color: #065f46; border: 1px solid #bbf7d0; text-align: center; margin: 20px 0;">
          Hito Completado: "${sprintName}"
        </div>
        <p>¡Gran trabajo por parte de todos! Accede al tablero para revisar el progreso del siguiente ciclo.</p>
        <p style="font-size: 12px; color: #a0aec0; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          Este es un correo automático de Holocron. Por favor, no respondas a este mensaje.
        </p>
      </div>
    `;

    await this.sendEmail(emails, subject, html, text);
  }
}
