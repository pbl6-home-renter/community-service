import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { CursorPaginationRequestDto } from 'shared/presentation/pagination/cursor-pagination.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MessageListQuery } from '../../../application/queries/message-list/message-list.query';

export class MessageListRequestDto extends CursorPaginationRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  conversationId: Uuid;

  @ApiPropertyOptional({
    type: String,
    pattern: '^[1-9]\\d{0,17}$',
    example: '42',
    description:
      'Chỉ trả tin có sequence <= maxSequence (mở tin tìm được); trang sau dùng cursor.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[1-9]\d{0,17}$/)
  maxSequence?: string;

  static toQuery(
    request: MessageListRequestDto,
    actorUserId: Uuid,
  ): MessageListQuery {
    return new MessageListQuery(
      request.conversationId,
      actorUserId,
      request.cursor,
      request.pageSize,
      request.maxSequence ?? null,
    );
  }
}
