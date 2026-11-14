import { IssueReportEntity } from 'modules/issue-report/domain/entities/issue-report.entity';
import { IssueCategory } from 'modules/issue-report/domain/enums/issue-category.enum';
import { IssueStatus } from 'modules/issue-report/domain/enums/issue-status.enum';
import { IssueUrgency } from 'modules/issue-report/domain/enums/issue-urgency.enum';
import { InvalidIssueTransitionException } from 'modules/issue-report/domain/exceptions/invalid-issue-transition.exception';
import { CannotCancelResolvedIssueException } from 'modules/issue-report/domain/exceptions/cannot-cancel-resolved-issue.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

const createIssue = () =>
  IssueReportEntity.create({
    roomId: generateUuid(),
    buildingId: generateUuid(),
    contractId: generateUuid(),
    creatorId: generateUuid(),
    title: 'Broken light',
    description: null,
    category: IssueCategory.ELECTRICAL,
    urgency: IssueUrgency.MEDIUM,
  });

describe('IssueReportEntity', () => {
  it('only advances in the approved order and keeps closure on repeated requests', () => {
    const issue = createIssue();
    expect(() => issue.advance(IssueStatus.RESOLVED)).toThrow(
      InvalidIssueTransitionException,
    );
    expect(issue.advance(IssueStatus.IN_PROGRESS)).toBe(true);
    const closedAt = new Date('2026-11-14T12:00:00Z');
    expect(issue.advance(IssueStatus.RESOLVED, closedAt)).toBe(true);
    expect(
      issue.advance(IssueStatus.RESOLVED, new Date('2026-11-15T12:00:00Z')),
    ).toBe(false);
    expect(issue.closedAt).toEqual(closedAt);
    expect(() => issue.advance(IssueStatus.OPEN)).toThrow(
      InvalidIssueTransitionException,
    );
    expect(() => issue.cancel()).toThrow(CannotCancelResolvedIssueException);
  });

  it('cancels an unresolved issue once and rejects later transitions', () => {
    const issue = createIssue();
    issue.advance(IssueStatus.IN_PROGRESS);
    const closedAt = new Date('2026-11-14T12:00:00Z');
    expect(issue.cancel(closedAt)).toBe(true);
    expect(issue.cancel()).toBe(false);
    expect(issue.closedAt).toEqual(closedAt);
    expect(() => issue.advance(IssueStatus.RESOLVED)).toThrow(
      InvalidIssueTransitionException,
    );
  });
});
