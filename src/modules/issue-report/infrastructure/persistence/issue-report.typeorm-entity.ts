import { Check, Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from 'shared/infrastructure/database/abstract.typeorm-entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueCategory } from '../../domain/enums/issue-category.enum';
import { IssueStatus } from '../../domain/enums/issue-status.enum';
import { IssueUrgency } from '../../domain/enums/issue-urgency.enum';

@Entity('issue_reports')
@Index('IDX_issue_reports_contract_created', ['contractId', 'createdAt'])
@Index('IDX_issue_reports_room_created', ['roomId', 'createdAt'])
@Check(
  'CHK_issue_reports_status',
  "status IN ('open', 'in_progress', 'resolved', 'cancelled')",
)
@Check(
  'CHK_issue_reports_closed_at',
  "(status IN ('resolved', 'cancelled')) = (closed_at IS NOT NULL)",
)
@Check('CHK_issue_reports_title', 'length(btrim(title)) BETWEEN 1 AND 255')
@Check(
  'CHK_issue_reports_description',
  'description IS NULL OR length(btrim(description)) BETWEEN 1 AND 500',
)
@Check(
  'CHK_issue_reports_category',
  "category IN ('PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'OTHER')",
)
@Check(
  'CHK_issue_reports_urgency',
  "urgency IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')",
)
export class IssueReportTypeormEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  roomId: Uuid;

  @Column({ type: 'uuid' })
  buildingId: Uuid;

  @Column({ type: 'uuid' })
  contractId: Uuid;

  @Column({ type: 'uuid' })
  creatorId: Uuid;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  category: IssueCategory;

  @Column({ type: 'varchar', length: 20 })
  urgency: IssueUrgency;

  @Column({ type: 'varchar', length: 20 })
  status: IssueStatus;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  assignedTo: string | null;

  @Column({ type: 'integer', nullable: true })
  repairCost: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resolutionNote: string | null;
}
