import { BaseEntity } from 'shared/domain/base/base.entity';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { EmailDeliveryProps } from './email-delivery.props';
import { EmailDeliveryStatus } from '../enums/email-delivery-status.enum';
import { EmailDeliveryStatusTransitionInvalidException } from '../exceptions/email-delivery-status-transition-invalid.exception';

export class EmailDelivery extends BaseEntity {
  private constructor(
    id: Uuid,
    readonly recipientEmail: string,
    readonly subject: string,
    private _status: EmailDeliveryStatus,
    private _failureReason: string | undefined,
    private _sentAt: Date | undefined,
    createdAt: Date,
    updatedAt: Date,
    isDeleted: boolean,
  ) {
    super(id, createdAt, updatedAt, isDeleted);
  }

  get status(): EmailDeliveryStatus {
    return this._status;
  }

  get failureReason(): string | undefined {
    return this._failureReason;
  }

  get sentAt(): Date | undefined {
    return this._sentAt;
  }

  markSent(at: Date): void {
    this.assertProcessing(EmailDeliveryStatus.SENT);
    this._status = EmailDeliveryStatus.SENT;
    this._sentAt = at;
    this._failureReason = undefined;
  }

  markFailed(reason: string): void {
    this.assertProcessing(EmailDeliveryStatus.FAILED);
    this._status = EmailDeliveryStatus.FAILED;
    this._failureReason = reason.slice(0, 1000);
  }

  private assertProcessing(nextStatus: EmailDeliveryStatus): void {
    if (this._status !== EmailDeliveryStatus.PROCESSING) {
      throw new EmailDeliveryStatusTransitionInvalidException(
        this._status,
        nextStatus,
      );
    }
  }

  static create(props: {
    id: Uuid;
    recipientEmail: string;
    subject: string;
    createdAt?: Date;
  }): EmailDelivery {
    const now = props.createdAt ?? new Date();
    return new EmailDelivery(
      props.id,
      props.recipientEmail,
      props.subject,
      EmailDeliveryStatus.PROCESSING,
      undefined,
      undefined,
      now,
      now,
      false,
    );
  }

  static reconstitute(props: EmailDeliveryProps): EmailDelivery {
    return new EmailDelivery(
      props.id,
      props.recipientEmail,
      props.subject,
      props.status,
      props.failureReason,
      props.sentAt,
      props.createdAt,
      props.updatedAt,
      props.isDeleted,
    );
  }
}
