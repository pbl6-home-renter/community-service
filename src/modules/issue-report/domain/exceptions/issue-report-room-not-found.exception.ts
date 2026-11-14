import { DomainException } from 'shared/domain/exceptions/domain.exception';

export class IssueReportRoomNotFoundException extends DomainException {
  constructor() {
    super('Room has no active contract', 404, 'ROOM_NOT_FOUND');
  }
}
