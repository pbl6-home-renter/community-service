import type { Request } from 'express';
import { AuthenticatedUser } from 'shared/application/auth/authenticated-user';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
