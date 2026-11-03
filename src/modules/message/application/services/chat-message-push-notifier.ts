import { Injectable, Logger } from '@nestjs/common';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { PUSH_DEVICE_DI_TOKEN } from 'modules/push-device/push-device.di-token';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { MessageEntity } from '../../domain/entities/message.entity';
import { MessageType } from '../../domain/enums/message-type.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { Inject } from '@nestjs/common';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';

@Injectable()
export class ChatMessagePushNotifier {
  private readonly logger = new Logger(ChatMessagePushNotifier.name);

  constructor(
    @Inject(CONVERSATION_MEMBER_DI_TOKEN.REPOSITORY)
    private readonly members: ConversationMemberRepository,
    @Inject(PUSH_DEVICE_DI_TOKEN.DELIVERY)
    private readonly pushDelivery: PushDeliveryPort,
  ) {}

  async notify(message: MessageEntity, senderUserId: Uuid): Promise<void> {
    try {
      const members = await this.members.findActiveUserMembers(
        message.conversationId,
      );
      const preview =
        message.type === MessageType.IMAGE
          ? 'Đã gửi ảnh'
          : (message.content ?? '').slice(0, 140);
      await this.pushDelivery.sendToUsers(
        members
          .map((member) => member.userId)
          .filter(
            (userId): userId is Uuid =>
              userId !== null && userId !== senderUserId,
          ),
        NotificationCategory.CHAT,
        {
          title: message.senderNameSnapshot,
          body: preview,
          data: {
            messageId: message.id,
            conversationId: message.conversationId,
            senderName: message.senderNameSnapshot,
            preview,
            deepLink: `/conversations/${message.conversationId}`,
          },
        },
      );
    } catch (error) {
      this.logger.warn(
        `Chat push delivery failed for message ${message.id}: ${String(error)}`,
      );
    }
  }
}
