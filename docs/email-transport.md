# Email transport

Community consumes the generic `email.send_requested` integration event from the shared RabbitMQ topic exchange and sends it through the configured SMTP transport. Identity publishes email-verification and password-reset emails; other services can publish the same contract without Community depending on their domain models.
The SMTP sender is also exported as an application port so the business-notification pipeline can add email as a delivery channel without creating a second transport.

```json
{
  "id": "<outbox-event-uuid>",
  "eventType": "email.send_requested",
  "payload": {
    "emailRequestId": "<identity-generated-uuid>",
    "to": "user@example.com",
    "subject": "Reset your Rentify password",
    "text": "Rendered plain-text content",
    "html": "Rendered HTML content"
  }
}
```

`text` or `html` is required. One request has one recipient and no attachments. The producer renders its own email content; Community applies the configured `MAIL_FROM` identity and sends the message.

Community inserts an `email_deliveries` row keyed by `emailRequestId` before calling SMTP. The row stores recipient, subject, status, failure reason and sent time, but never stores text or HTML. Re-delivery of the same request ID is ignored. SMTP failures are marked `failed` and acknowledged without retry; a new request ID is required to send again. Metadata is purged after `EMAIL_DELIVERY_RETENTION_MS` (90 days by default).

Identity should be deployed only after the durable `community.email` consumer queue has been declared. Identity keeps `RABBITMQ_PUBLISH_MANDATORY=false` while other `user.*` events have no subscribers, so deployment order is required for the initial email route.
