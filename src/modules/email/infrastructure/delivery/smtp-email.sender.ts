import { Injectable } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { ApiConfigService } from 'shared/infrastructure/config/api-config.service';
import {
  EmailMessage,
  EmailSenderPort,
} from '../../application/ports/email-sender.port';

@Injectable()
export class SmtpEmailSender implements EmailSenderPort {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: ApiConfigService) {
    const smtp = config.smtp;
    const hasUser = smtp.user.length > 0;
    const hasPassword = smtp.password.length > 0;
    if (hasUser !== hasPassword) {
      throw new Error('MAIL_USER and MAIL_PASS must both be configured');
    }

    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: hasUser ? { user: smtp.user, pass: smtp.password } : undefined,
    });
    this.from = `${smtp.fromName} <${smtp.fromAddress}>`;
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
