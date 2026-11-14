import { NotificationEntity } from 'modules/notification/domain/entities/notification.entity';
import { NotificationType } from 'modules/notification/domain/enums/notification-type.enum';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('NotificationEntity', () => {
  it('marks a notification read once and preserves the first read time', () => {
    const notification = NotificationEntity.create({
      recipientUserId: generateUuid(),
      sourceService: 'tenancy',
      eventId: generateUuid(),
      type: NotificationType.INVOICE,
      title: 'Invoice ready',
      body: 'Your invoice is available',
    });
    const firstReadAt = new Date('2026-11-01T10:00:00.000Z');

    notification.markRead(firstReadAt);
    notification.markRead(new Date('2026-11-02T10:00:00.000Z'));

    expect(notification.readAt).toBe(firstReadAt);
  });

  it('rejects blank display fields and oversized deep links', () => {
    const validProps = {
      recipientUserId: generateUuid(),
      sourceService: 'tenancy',
      eventId: generateUuid(),
      type: NotificationType.INVOICE,
      title: 'Invoice ready',
      body: 'Your invoice is available',
    };

    expect(() =>
      NotificationEntity.create({ ...validProps, title: '   ' }),
    ).toThrow(ValidationException);
    expect(() =>
      NotificationEntity.create({
        ...validProps,
        deepLink: 'x'.repeat(2049),
      }),
    ).toThrow(ValidationException);
  });
});
