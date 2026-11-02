import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray } from 'class-validator';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IsUuid } from 'shared/presentation/validators/is-uuid.decorator';
import { ConversationMembersAddCommand } from '../../../application/commands/conversation-members-add/conversation-members-add.command';

export class ConversationMembersAddRequestDto {
  @ApiProperty({ type: [String], minItems: 1, uniqueItems: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUuid('INVALID_UUID', { each: true })
  userIds: Uuid[];

  static toCommand(
    request: ConversationMembersAddRequestDto,
    conversationId: Uuid,
    callerUserId: Uuid,
  ): ConversationMembersAddCommand {
    return new ConversationMembersAddCommand(
      conversationId,
      callerUserId,
      request.userIds,
    );
  }
}
