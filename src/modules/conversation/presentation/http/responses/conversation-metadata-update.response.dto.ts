import { ApiProperty } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationEntity } from '../../../domain/entities/conversation.entity';
import { ConversationContextType } from '../../../domain/enums/conversation-context-type.enum';
import { ConversationKind } from '../../../domain/enums/conversation-kind.enum';

export class ConversationMetadataUpdateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: Uuid;

  @ApiProperty({ enum: ConversationKind })
  kind: ConversationKind;

  @ApiProperty({ enum: ['contract', 'building'], nullable: true })
  contextType: ConversationContextType | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  contextId: Uuid | null;

  @ApiProperty({ maxLength: 255, nullable: true })
  title: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  avatarMediaId: Uuid | null;

  static fromDomain(
    conversation: ConversationEntity,
  ): ConversationMetadataUpdateResponseDto {
    const response = new ConversationMetadataUpdateResponseDto();
    response.id = conversation.id;
    response.kind = conversation.kind;
    response.contextType = conversation.contextType;
    response.contextId = conversation.contextId;
    response.title = conversation.title?.value ?? null;
    response.avatarMediaId = conversation.avatarMediaId;
    return response;
  }
}
