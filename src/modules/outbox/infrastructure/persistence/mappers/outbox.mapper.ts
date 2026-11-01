import { OutboxMessage } from '../../../domain/entities/outbox-message.entity';
import { OutboxTypeormEntity } from '../outbox.typeorm-entity';

export class OutboxMapper {
  static toDomain(raw: OutboxTypeormEntity): OutboxMessage {
    return OutboxMessage.reconstitute({
      id: raw.id,
      aggregateType: raw.aggregateType,
      aggregateId: raw.aggregateId,
      eventType: raw.eventType,
      routingKey: raw.routingKey,
      payload: raw.payload,
      headers: raw.headers ?? undefined,
      status: raw.status,
      retryCount: raw.retryCount,
      availableAt: raw.availableAt,
      claimedAt: raw.claimedAt ?? undefined,
      processedAt: raw.processedAt ?? undefined,
      lastError: raw.lastError ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
    });
  }

  static toPersistence(domain: OutboxMessage): OutboxTypeormEntity {
    const raw = new OutboxTypeormEntity();
    raw.id = domain.id;
    raw.aggregateType = domain.aggregateType;
    raw.aggregateId = domain.aggregateId;
    raw.eventType = domain.eventType;
    raw.routingKey = domain.routingKey;
    raw.payload = domain.payload;
    raw.headers = domain.headers ?? null;
    raw.status = domain.status;
    raw.retryCount = domain.retryCount;
    raw.availableAt = domain.availableAt;
    raw.claimedAt = domain.claimedAt ?? null;
    raw.processedAt = domain.processedAt ?? null;
    raw.lastError = domain.lastError ?? null;
    raw.createdAt = domain.createdAt;
    raw.updatedAt = domain.updatedAt;
    raw.isDeleted = domain.isDeleted;
    return raw;
  }
}
