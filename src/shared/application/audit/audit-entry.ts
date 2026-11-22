export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string | null;
  actorId: string | null;
  metadata?: Record<string, unknown>;
  /** Defaults to the recording time when omitted. */
  occurredAt?: Date;
  /** Event identifier used by the adapter for deduplication. */
  sourceEventId?: string;
}
