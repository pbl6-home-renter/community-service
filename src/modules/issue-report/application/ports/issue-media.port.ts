import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export const ISSUE_MEDIA_PORT = Symbol('ISSUE_MEDIA_PORT');

export interface IssueMediaPort {
  completedPhotoIds(issueId: Uuid): Promise<Uuid[]>;
}
