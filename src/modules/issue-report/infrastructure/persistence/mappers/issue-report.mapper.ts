import { IssueReportEntity } from '../../../domain/entities/issue-report.entity';
import { IssueReportTypeormEntity } from '../issue-report.typeorm-entity';

export class IssueReportMapper {
  static toDomain(row: IssueReportTypeormEntity): IssueReportEntity {
    return IssueReportEntity.reconstitute({ ...row });
  }

  static toPersistence(issue: IssueReportEntity): IssueReportTypeormEntity {
    return Object.assign(new IssueReportTypeormEntity(), {
      id: issue.id,
      roomId: issue.roomId,
      buildingId: issue.buildingId,
      contractId: issue.contractId,
      creatorId: issue.creatorId,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      urgency: issue.urgency,
      status: issue.status,
      closedAt: issue.closedAt,
      assignedTo: issue.assignedTo,
      repairCost: issue.repairCost,
      resolutionNote: issue.resolutionNote,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      isDeleted: issue.isDeleted,
    });
  }
}
