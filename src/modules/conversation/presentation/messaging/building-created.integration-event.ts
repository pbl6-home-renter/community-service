import { IntegrationEvent } from 'shared/application/messaging/integration-event';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';

export interface BuildingCreatedPayload {
  id: Uuid;
  landlordId: Uuid;
  name: string;
}

export type BuildingCreatedIntegrationEvent =
  IntegrationEvent<BuildingCreatedPayload>;
