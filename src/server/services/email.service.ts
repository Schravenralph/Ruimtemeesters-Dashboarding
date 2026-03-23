/**
 * Email Service — SMTP via nodemailer.
 * Pattern copied from Ruimtemeesters-Databank.
 * Uses Gmail SMTP with app password.
 */

import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private defaultFrom: string;

  constructor() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    // Gmail SMTP requires from address to match the authenticated account
    this.defaultFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com';

    if (smtpHost && smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPassword },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000,
        pool: false,
        requireTLS: smtpPort === 587,
        family: 0,
      } as any);
      console.log(`[Email] SMTP configured: ${smtpHost}:${smtpPort}`);
    } else {
      console.log('[Email] SMTP not configured — emails will be logged only');
    }
  }

  isAvailable(): boolean {
    return !!this.transporter;
  }

  async send(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      console.log(`[Email] Would send to ${options.to}: ${options.subject}`);
      return;
    }

    const result = await this.transporter.sendMail({
      from: options.from || this.defaultFrom,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || '',
      attachments: options.attachments,
    });

    console.log(`[Email] Sent to ${options.to}: ${options.subject} (${result.messageId})`);
  }
}

let instance: EmailService | null = null;
export function getEmailService(): EmailService {
  if (!instance) instance = new EmailService();
  return instance;
}
