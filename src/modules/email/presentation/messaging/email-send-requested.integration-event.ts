import { isEmail } from 'class-validator';
import { Uuid, isValidUuid } from 'shared/domain/value-objects/uuid.vo';
import { EmailMessage } from '../../application/ports/email-sender.port';
import { EmailSendRequestedEventInvalidException } from '../../domain/exceptions/email-send-requested-event-invalid.exception';
import { EMAIL_INTEGRATION_EVENTS } from './email-consumer.constants';

export interface EmailSendRequestedPayload extends EmailMessage {
  emailRequestId: Uuid;
}

export interface EmailSendRequestedIntegrationEvent {
  id: Uuid;
  eventType: string;
  payload: EmailSendRequestedPayload;
}

export class EmailSendRequestedEventValidator {
  static assert(
    value: unknown,
  ): asserts value is EmailSendRequestedIntegrationEvent {
    if (!this.isRecord(value)) {
      throw new EmailSendRequestedEventInvalidException(
        'Integration event must be an object',
      );
    }
    if (typeof value.id !== 'string' || !isValidUuid(value.id)) {
      throw new EmailSendRequestedEventInvalidException(
        'Integration event id must be a UUID',
      );
    }
    if (value.eventType !== EMAIL_INTEGRATION_EVENTS.SEND_REQUESTED) {
      throw new EmailSendRequestedEventInvalidException(
        'Unsupported email integration event type',
      );
    }
    if (!this.isRecord(value.payload)) {
      throw new EmailSendRequestedEventInvalidException(
        'Integration event payload must be an object',
      );
    }

    const { emailRequestId, to, subject, text, html } = value.payload;
    if (typeof emailRequestId !== 'string' || !isValidUuid(emailRequestId)) {
      throw new EmailSendRequestedEventInvalidException(
        'emailRequestId must be a UUID',
      );
    }
    if (typeof to !== 'string' || to.length > 320 || !isEmail(to)) {
      throw new EmailSendRequestedEventInvalidException(
        'Recipient email is invalid',
      );
    }
    if (
      typeof subject !== 'string' ||
      !subject.trim() ||
      subject.length > 255
    ) {
      throw new EmailSendRequestedEventInvalidException(
        'Email subject is invalid',
      );
    }
    if (
      (text !== undefined && typeof text !== 'string') ||
      (html !== undefined && typeof html !== 'string') ||
      (!text && !html) ||
      (typeof text === 'string' && text.length > 100_000) ||
      (typeof html === 'string' && html.length > 100_000)
    ) {
      throw new EmailSendRequestedEventInvalidException(
        'Email must contain a text or HTML body under 100 KB',
      );
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
