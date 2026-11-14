import { EmailDelivery } from 'modules/email/domain/entities/email-delivery.entity';
import { EmailDeliveryStatus } from 'modules/email/domain/enums/email-delivery-status.enum';
import { EmailDeliveryStatusTransitionInvalidException } from 'modules/email/domain/exceptions/email-delivery-status-transition-invalid.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('EmailDelivery', () => {
  it('records successful delivery and clears prior failure information', () => {
    const delivery = EmailDelivery.reconstitute({
      id: generateUuid(),
      recipientEmail: 'tenant@example.com',
      subject: 'Invoice ready',
      status: EmailDeliveryStatus.PROCESSING,
      failureReason: 'old failure',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
      updatedAt: new Date('2026-11-01T00:00:00.000Z'),
      isDeleted: false,
    });
    const sentAt = new Date('2026-11-02T00:00:00.000Z');

    delivery.markSent(sentAt);

    expect(delivery.status).toBe(EmailDeliveryStatus.SENT);
    expect(delivery.sentAt).toBe(sentAt);
    expect(delivery.failureReason).toBeUndefined();
  });

  it('limits failure detail and prevents terminal deliveries from transitioning again', () => {
    const delivery = EmailDelivery.create({
      id: generateUuid(),
      recipientEmail: 'tenant@example.com',
      subject: 'Invoice ready',
    });

    delivery.markFailed('x'.repeat(1200));

    expect(delivery.status).toBe(EmailDeliveryStatus.FAILED);
    expect(delivery.failureReason).toHaveLength(1000);
    expect(() => delivery.markSent(new Date())).toThrow(
      EmailDeliveryStatusTransitionInvalidException,
    );
  });
});
