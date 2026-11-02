import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { MessageMarkReadResult } from '../../../application/commands/message-mark-read/message-mark-read.result';

export class MessageMarkReadResponseDto {
  @ApiProperty({ format: 'uuid' })
  conversationId: Uuid;

  @ApiProperty({ minimum: 0 })
  unreadCount: number;

  static fromResult(result: MessageMarkReadResult): MessageMarkReadResponseDto {
    return Object.assign(new MessageMarkReadResponseDto(), result);
  }
}
