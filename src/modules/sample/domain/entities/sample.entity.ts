import { AggregateRoot } from 'shared/domain/base/aggregate-root';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { SampleCreatedEvent } from '../events/sample-created.event';
import { SampleDeletedEvent } from '../events/sample-deleted.event';

export interface CreateSampleProps {
  id?: Uuid;
  title: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
}

export class SampleEntity extends AggregateRoot {
  private _title: string;
  private _description?: string;

  private constructor(
    id: Uuid,
    title: string,
    description: string | undefined,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean = false,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
    this._title = title;
    this._description = description;
  }

  static create(props: CreateSampleProps): SampleEntity {
    const sample = SampleEntity.reconstitute(props);

    sample.addDomainEvent(
      new SampleCreatedEvent(sample.id, sample.title, sample.description),
    );

    return sample;
  }

  static reconstitute(props: CreateSampleProps): SampleEntity {
    return new SampleEntity(
      props.id ?? generateUuid(),
      props.title,
      props.description,
      props.createdAt ?? new Date(),
      props.updatedAt ?? new Date(),
      props.isDeleted ?? false,
    );
  }

  get title(): string {
    return this._title;
  }

  get description(): string | undefined {
    return this._description;
  }

  delete(): void {
    if (this.isDeleted) return;

    this.markAsDeleted();

    this.addDomainEvent(new SampleDeletedEvent(this.id));
  }

  updateTitle(title: string): void {
    this._title = title;
  }

  updateDescription(description: string): void {
    this._description = description;
  }
}
