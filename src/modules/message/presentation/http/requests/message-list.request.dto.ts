import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { CursorPaginationRequestDto } from 'shared/presentation/pagination/cursor-pagination.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MessageListQuery } from '../../../application/queries/message-list/message-list.query';

export class MessageListRequestDto extends CursorPaginationRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  conversationId: Uuid;

  static toQuery(
    request: MessageListRequestDto,
    actorUserId: Uuid,
  ): MessageListQuery {
    return new MessageListQuery(
      request.conversationId,
      actorUserId,
      request.cursor,
      request.pageSize,
    );
  }
}
