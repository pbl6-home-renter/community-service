import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { CursorPaginationRequestDto } from 'shared/presentation/pagination/cursor-pagination.request.dto';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { MessageSearchQuery } from '../../../application/queries/message-search/message-search.query';

export class MessageSearchRequestDto extends CursorPaginationRequestDto {
  @ApiProperty({ format: 'uuid' })
  @IsUuid()
  @IsNotEmpty()
  conversationId: Uuid;

  @ApiProperty({
    minLength: 2,
    maxLength: 100,
    description:
      'Từ khóa; chuẩn hóa NFC và trim. Không phân biệt hoa/thường và dấu tiếng Việt.',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.normalize('NFC').trim() : value,
  )
  @IsString()
  @Length(2, 100)
  q: string;

  static toQuery(
    request: MessageSearchRequestDto,
    actorUserId: Uuid,
  ): MessageSearchQuery {
    return new MessageSearchQuery(
      request.conversationId,
      actorUserId,
      request.q,
      request.cursor,
      request.pageSize,
    );
  }
}
