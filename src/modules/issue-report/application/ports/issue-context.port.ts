import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { UserRole } from 'shared/domain/enums/user-role.enum';

export const ISSUE_CONTEXT_PORT = Symbol('ISSUE_CONTEXT_PORT');

export interface IssueContext {
  contractId: Uuid;
  roomId: Uuid;
  roomName: string;
  buildingId: Uuid;
  buildingName: string;
  landlordId: Uuid;
  contractStatus: string;
  participantUserIds: Uuid[];
}

export interface IssueContextPort {
  byRoom(roomId: Uuid): Promise<IssueContext | null>;
  byContract(contractId: Uuid): Promise<IssueContext | null>;
  visibleContracts(userId: Uuid, role: UserRole): Promise<Uuid[]>;
}
