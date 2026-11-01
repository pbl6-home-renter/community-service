import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOutboxAndInboxTables1760500000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.createTable(
      new Table({
        name: 'outbox_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'is_deleted', type: 'boolean', default: false },
          { name: 'aggregate_type', type: 'varchar', length: '100' },
          { name: 'aggregate_id', type: 'uuid' },
          { name: 'event_type', type: 'varchar', length: '150' },
          { name: 'routing_key', type: 'varchar', length: '150' },
          { name: 'payload', type: 'jsonb' },
          { name: 'headers', type: 'jsonb', isNullable: true },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'PENDING'",
          },
          { name: 'retry_count', type: 'integer', default: 0 },
          { name: 'available_at', type: 'timestamptz', default: 'now()' },
          { name: 'claimed_at', type: 'timestamptz', isNullable: true },
          { name: 'processed_at', type: 'timestamptz', isNullable: true },
          { name: 'last_error', type: 'text', isNullable: true },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'outbox_messages',
      new TableIndex({
        name: 'IDX_outbox_status_available',
        columnNames: ['status', 'available_at'],
      }),
    );
    await queryRunner.createIndex(
      'outbox_messages',
      new TableIndex({
        name: 'IDX_outbox_aggregate_created',
        columnNames: ['aggregate_id', 'created_at'],
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'processed_events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
          { name: 'updated_at', type: 'timestamptz', default: 'now()' },
          { name: 'is_deleted', type: 'boolean', default: false },
          { name: 'message_id', type: 'uuid' },
          { name: 'event_type', type: 'varchar', length: '150' },
          { name: 'processed_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );
    await queryRunner.createIndex(
      'processed_events',
      new TableIndex({
        name: 'UQ_processed_events_message_id',
        columnNames: ['message_id'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('processed_events', true);
    await queryRunner.dropTable('outbox_messages', true);
  }
}
