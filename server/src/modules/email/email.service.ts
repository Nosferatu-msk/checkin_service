import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD');
    this.fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', 'noreply@checkin-service.com');
    this.appUrl = this.configService.get<string>('APP_URL', 'https://app.checkin-service.com');

    // Если SMTP не настроен, используем ethereal (для разработки)
    if (!smtpHost) {
      console.warn('SMTP not configured. Using Ethereal for email testing.');
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
      });
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #007bff;
              color: #ffffff;
              text-decoration: none;
              border-radius: 4px;
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Сброс пароля</h2>
            <p>Вы получили это письмо, потому что запросили сброс пароля для вашей учетной записи.</p>
            <p>Нажмите кнопку ниже, чтобы сбросить пароль:</p>
            <a href="${resetUrl}" class="button">Сбросить пароль</a>
            <p>Или скопируйте эту ссылку в браузер:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p><strong>Ссылка действительна в течение 1 часа.</strong></p>
            <p>Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
            <div class="footer">
              <p>Это автоматическое сообщение, пожалуйста, не отвечайте на него.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Сброс пароля
      
      Вы получили это письмо, потому что запросили сброс пароля для вашей учетной записи.
      
      Чтобы сбросить пароль, перейдите по ссылке:
      ${resetUrl}
      
      Ссылка действительна в течение 1 часа.
      
      Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.
      
      Это автоматическое сообщение, пожалуйста, не отвечайте на него.
    `;

    await this.sendMail({
      to: email,
      subject: 'Сброс пароля - CheckIn Service',
      text,
      html,
    });
  }

  private async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    // Если transporter не настроен, логируем письмо (для разработки)
    if (!this.transporter) {
      console.log('=== EMAIL (Development Mode) ===');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Text: ${options.text}`);
      console.log('===============================');
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        ...options,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      // В production можно выбросить исключение
      // throw new InternalServerErrorException('Failed to send email');
    }
  }
}
