import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueCategory } from '../enums/issue-category.enum';
import { IssueStatus } from '../enums/issue-status.enum';
import { IssueUrgency } from '../enums/issue-urgency.enum';

export interface IssueReportProps {
  id?: Uuid;
  roomId: Uuid;
  buildingId: Uuid;
  contractId: Uuid;
  creatorId: Uuid;
  title: string;
  description: string | null;
  category: IssueCategory;
  urgency: IssueUrgency;
  status?: IssueStatus;
  assignedTo?: string | null;
  repairCost?: number | null;
  resolutionNote?: string | null;
  closedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}
