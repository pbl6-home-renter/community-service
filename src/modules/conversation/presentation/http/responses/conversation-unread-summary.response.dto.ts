import { ApiProperty } from '@nestjs/swagger';

export class ConversationUnreadSummaryResponseDto {
  @ApiProperty({ minimum: 0, example: 12 })
  totalUnreadCount: number;

  static fromCount(
    totalUnreadCount: number,
  ): ConversationUnreadSummaryResponseDto {
    const response = new ConversationUnreadSummaryResponseDto();
    response.totalUnreadCount = totalUnreadCount;
    return response;
  }
}
