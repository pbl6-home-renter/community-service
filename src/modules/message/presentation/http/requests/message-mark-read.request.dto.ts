import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MessageMarkReadCommand } from '../../../application/commands/message-mark-read/message-mark-read.command';

export class MessageMarkReadRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  conversationId: Uuid;

  @ApiProperty({
    type: String,
    pattern: '^(0|[1-9]\\d*)$',
    example: '42',
  })
  @IsString()
  @Matches(/^(0|[1-9]\d*)$/)
  lastReadSequence: string;

  static toCommand(
    request: MessageMarkReadRequestDto,
    actorUserId: Uuid,
  ): MessageMarkReadCommand {
    return new MessageMarkReadCommand(
      request.conversationId,
      actorUserId,
      request.lastReadSequence,
    );
  }
}
