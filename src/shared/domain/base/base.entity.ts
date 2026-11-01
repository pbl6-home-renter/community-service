import { Uuid } from '../value-objects/uuid.vo';

export abstract class BaseEntity {
  constructor(
    readonly id: Uuid,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    protected _isDeleted: boolean = false,
  ) {}

  get isDeleted(): boolean {
    return this._isDeleted;
  }

  markAsDeleted(): void {
    this._isDeleted = true;
  }
}
