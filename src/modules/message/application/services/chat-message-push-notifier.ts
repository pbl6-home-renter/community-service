import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConversationMemberRepository } from 'modules/conversation-member/domain/repositories/conversation-member.repository';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { PUSH_DEVICE_DI_TOKEN } from 'modules/push-device/push-device.di-token';
import { PushDeliveryPort } from 'modules/push-device/application/ports/push-delivery.port';
import { MessageEntity } from '../../domain/entities/message.entity';
import { MessageType } from '../../domain/enums/message-type.enum';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { CONVERSATION_MEMBER_DI_TOKEN } from 'modules/conversation-member/conversation-member.di-token';

const PREVIEW_MAX_LENGTH = 140;
const IMAGE_MESSAGE_PREVIEW = 'Đã gửi ảnh';

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
      // Array.from splits by code point so an emoji is never cut in half.
      const preview =
        message.type === MessageType.IMAGE
          ? IMAGE_MESSAGE_PREVIEW
          : Array.from(message.content ?? '')
              .slice(0, PREVIEW_MAX_LENGTH)
              .join('');
      const pushMessage = {
        title: message.senderNameSnapshot,
        body: preview,
        data: {
          messageId: message.id,
          conversationId: message.conversationId,
          senderName: message.senderNameSnapshot,
          preview,
          deepLink: `/conversations/${message.conversationId}`,
        },
      };
      await this.pushDelivery.send(
        NotificationCategory.CHAT,
        members
          .map((member) => member.userId)
          .filter(
            (userId): userId is Uuid =>
              userId !== null && userId !== senderUserId,
          )
          .map((userId) => ({ userId, message: pushMessage })),
      );
    } catch (error) {
      this.logger.warn(
        `Chat push delivery failed for message ${message.id}: ${String(error)}`,
      );
    }
  }
}
