import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOutboxSequence1760600000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE outbox_messages ADD COLUMN sequence BIGSERIAL NOT NULL',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_outbox_aggregate_created"',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_outbox_aggregate_sequence" ON outbox_messages (aggregate_id, sequence)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_outbox_status_processed" ON outbox_messages (status, processed_at)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_outbox_status_processed"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_outbox_aggregate_sequence"',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_outbox_aggregate_created" ON outbox_messages (aggregate_id, created_at)',
    );
    await queryRunner.query('ALTER TABLE outbox_messages DROP COLUMN sequence');
  }
}
