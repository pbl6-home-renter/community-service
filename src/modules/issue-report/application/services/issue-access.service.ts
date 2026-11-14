import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { IssueContext } from '../ports/issue-context.port';

/** Contract members are valid only when Tenancy says the contract is active. */
export class IssueAccessService {
  static canView(user: AuthenticatedUser, context: IssueContext): boolean {
    if (user.role === UserRole.LANDLORD) return context.landlordId === user.id;
    return (
      user.role === UserRole.TENANT &&
      context.contractStatus === 'active' &&
      context.participantUserIds.includes(user.id)
    );
  }

  static canManage(user: AuthenticatedUser, context: IssueContext): boolean {
    return user.role === UserRole.LANDLORD && context.landlordId === user.id;
  }
}
