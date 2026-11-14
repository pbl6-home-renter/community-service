import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { Uuid, generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { IssueCategory } from '../enums/issue-category.enum';
import { IssueStatus } from '../enums/issue-status.enum';
import { IssueUrgency } from '../enums/issue-urgency.enum';
import { InvalidIssueTransitionException } from '../exceptions/invalid-issue-transition.exception';
import { CannotCancelResolvedIssueException } from '../exceptions/cannot-cancel-resolved-issue.exception';
import { IssueReportProps } from './issue-report.props';

export class IssueReportEntity extends AggregateRoot {
  private constructor(
    id: Uuid,
    readonly roomId: Uuid,
    readonly buildingId: Uuid,
    readonly contractId: Uuid,
    readonly creatorId: Uuid,
    readonly title: string,
    readonly description: string | null,
    readonly category: IssueCategory,
    readonly urgency: IssueUrgency,
    private _status: IssueStatus,
    private _closedAt: Date | null,
    private _assignedTo: string | null,
    private _repairCost: number | null,
    private _resolutionNote: string | null,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  static create(props: IssueReportProps): IssueReportEntity {
    return IssueReportEntity.reconstitute({
      ...props,
      status: IssueStatus.OPEN,
      closedAt: null,
    });
  }

  static reconstitute(props: IssueReportProps): IssueReportEntity {
    const title = props.title.trim();
    if (
      !title ||
      title.length > 255 ||
      (props.description !== null &&
        (!props.description.trim() || props.description.length > 500))
    ) {
      throw new ValidationException('Invalid issue title or description');
    }
    if (
      !Object.values(IssueCategory).includes(props.category) ||
      !Object.values(IssueUrgency).includes(props.urgency)
    ) {
      throw new ValidationException('Invalid issue category or urgency');
    }
    const status = props.status ?? IssueStatus.OPEN;
    const closedAt = props.closedAt ?? null;
    IssueReportEntity.validateDetails(props);
    if (
      !Object.values(IssueStatus).includes(status) ||
      [IssueStatus.RESOLVED, IssueStatus.CANCELLED].includes(status) !==
        (closedAt !== null)
    ) {
      throw new ValidationException('Invalid issue status or closing time');
    }
    return new IssueReportEntity(
      props.id ?? generateUuid(),
      props.roomId,
      props.buildingId,
      props.contractId,
      props.creatorId,
      title,
      props.description,
      props.category,
      props.urgency,
      status,
      closedAt,
      props.assignedTo ?? null,
      props.repairCost ?? null,
      props.resolutionNote ?? null,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  get status(): IssueStatus {
    return this._status;
  }
  get closedAt(): Date | null {
    return this._closedAt ? new Date(this._closedAt) : null;
  }
  get assignedTo(): string | null {
    return this._assignedTo;
  }
  get repairCost(): number | null {
    return this._repairCost;
  }
  get resolutionNote(): string | null {
    return this._resolutionNote;
  }

  updateDetails(
    details: Pick<
      IssueReportProps,
      'assignedTo' | 'repairCost' | 'resolutionNote'
    >,
    now = new Date(),
  ): boolean {
    IssueReportEntity.validateDetails(details);
    const assignedTo =
      details.assignedTo === undefined ? this._assignedTo : details.assignedTo;
    const repairCost =
      details.repairCost === undefined ? this._repairCost : details.repairCost;
    const resolutionNote =
      details.resolutionNote === undefined
        ? this._resolutionNote
        : details.resolutionNote;
    if (
      assignedTo === this._assignedTo &&
      repairCost === this._repairCost &&
      resolutionNote === this._resolutionNote
    )
      return false;
    if (
      this._status === IssueStatus.RESOLVED ||
      this._status === IssueStatus.CANCELLED
    )
      throw new InvalidIssueTransitionException();
    this._assignedTo = assignedTo;
    this._repairCost = repairCost;
    this._resolutionNote = resolutionNote;
    this.updatedAt.setTime(now.getTime());
    return true;
  }

  private static validateDetails(
    details: Pick<
      IssueReportProps,
      'assignedTo' | 'repairCost' | 'resolutionNote'
    >,
  ): void {
    for (const value of [details.assignedTo, details.resolutionNote]) {
      if (value != null && (!value.trim() || value.length > 500))
        throw new ValidationException('Invalid issue details');
    }
    if (
      details.repairCost != null &&
      (!Number.isSafeInteger(details.repairCost) ||
        details.repairCost < 0 ||
        details.repairCost > 2147483647)
    ) {
      throw new ValidationException('Invalid issue repair cost');
    }
  }

  advance(status: IssueStatus, now = new Date()): boolean {
    if (status === this._status) return false;
    if (!(
      (this._status === IssueStatus.OPEN &&
        status === IssueStatus.IN_PROGRESS) ||
      (this._status === IssueStatus.IN_PROGRESS &&
        status === IssueStatus.RESOLVED)
    )) {
      throw new InvalidIssueTransitionException();
    }
    this._status = status;
    this._closedAt = status === IssueStatus.RESOLVED ? new Date(now) : null;
    this.updatedAt.setTime(now.getTime());
    return true;
  }

  cancel(now = new Date()): boolean {
    if (this._status === IssueStatus.CANCELLED) return false;
    if (this._status === IssueStatus.RESOLVED)
      throw new CannotCancelResolvedIssueException();
    this._status = IssueStatus.CANCELLED;
    this._closedAt = new Date(now);
    this.updatedAt.setTime(now.getTime());
    return true;
  }
}
