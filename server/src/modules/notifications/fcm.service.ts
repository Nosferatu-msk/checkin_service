import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  initializeApp,
  applicationDefault,
  cert,
  getApps,
  App,
} from 'firebase-admin/app';
import { getMessaging, Messaging, BatchResponse } from 'firebase-admin/messaging';

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private messaging: Messaging;

  constructor(private configService: ConfigService) {
    let app: App;

    if (!getApps().length) {
      const serviceAccountPath = this.configService.get<string>(
        'FIREBASE_CREDENTIALS_PATH',
      );

      if (serviceAccountPath) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const serviceAccount = require(serviceAccountPath);
        app = initializeApp({
          credential: cert(serviceAccount),
        });
        this.logger.log('Firebase Admin SDK initialized with service account');
      } else {
        app = initializeApp({
          credential: applicationDefault(),
        });
        this.logger.log(
          'Firebase Admin SDK initialized with application default credentials',
        );
      }
    } else {
      app = getApps()[0];
    }

    this.messaging = getMessaging(app);
  }

  async sendPushNotification(
    token: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        token,
      };

      const messageId = await this.messaging.send(message);
      this.logger.log(`Push notification sent successfully: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`FCM send error: ${error.message}`, error.stack);
      return { success: false, error: error.message };
    }
  }

  async sendMulticast(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, string>;
    },
  ): Promise<{
    success: boolean;
    successCount?: number;
    failureCount?: number;
    error?: string;
  }> {
    if (tokens.length === 0) {
      return { success: true, successCount: 0, failureCount: 0 };
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data || {},
        tokens,
      };

      const response = await this.messaging.sendEachForMulticast(message);
      this.logger.log(
        `FCM multicast: ${response.successCount} success, ${response.failureCount} failures`,
      );

      // Деактивация невалидных токенов
      if (response.failureCount > 0) {
        this.handleInvalidTokens(tokens, response);
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      this.logger.error(
        `FCM multicast error: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  private handleInvalidTokens(
    tokens: string[],
    response: BatchResponse,
  ): void {
    const invalidTokens: string[] = [];

    response.responses.forEach((resp, index) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        // Токены, которые больше не действительны
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered' ||
          errorCode === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(tokens[index]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      this.logger.warn(
        `Found ${invalidTokens.length} invalid push tokens, they should be deactivated`,
      );
      // Логирование для последующей очистки (можно расширить до автоматической деактивации)
    }
  }
}
