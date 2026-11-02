import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Max, Min } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MessageMarkReadCommand } from '../../../application/commands/message-mark-read/message-mark-read.command';

export class MessageMarkReadRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  conversationId: Uuid;

  @ApiProperty({
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
    format: 'int64',
  })
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  lastReadSequence: number;

  static toCommand(
    request: MessageMarkReadRequestDto,
    actorUserId: Uuid,
  ): MessageMarkReadCommand {
    return new MessageMarkReadCommand(
      request.conversationId,
      actorUserId,
      String(request.lastReadSequence),
    );
  }
}
