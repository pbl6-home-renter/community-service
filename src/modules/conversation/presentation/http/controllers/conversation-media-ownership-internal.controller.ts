import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiExcludeController } from '@nestjs/swagger';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { ConversationMediaOwnershipResult } from 'modules/conversation/application/ports/conversation-media-ownership-query.port';
import { ConversationMediaOwnershipLookupQuery } from 'modules/conversation/application/queries/conversation-media-ownership-lookup/conversation-media-ownership-lookup.query';
import { InternalOnly } from 'shared/presentation/decorators/auth/internal-only.decorator';

/** Internal authorization lookup used by Identity Media; never routed by the gateway. */
@ApiExcludeController()
@InternalOnly()
@Controller('internal/ownership/conversation')
export class ConversationMediaOwnershipInternalController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':conversationId')
  async getOwnership(
    @Param('conversationId', ParseUUIDPipe) conversationId: Uuid,
    @Query('actorUserId', ParseUUIDPipe) actorUserId: Uuid,
    @Query('mediaId', new ParseUUIDPipe({ optional: true })) mediaId?: Uuid,
  ): Promise<ConversationMediaOwnershipResult> {
    const result: ConversationMediaOwnershipResult | null =
      await this.queryBus.execute(
        new ConversationMediaOwnershipLookupQuery(
          conversationId,
          actorUserId,
          mediaId,
        ),
      );
    if (!result) {
      throw new NotFoundException({ code: 'RESOURCE_NOT_FOUND' });
    }
    return result;
  }
}
