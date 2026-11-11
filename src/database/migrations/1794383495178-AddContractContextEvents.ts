import { MigrationInterface, QueryRunner } from "typeorm";

export class AddContractContextEvents1794383495178 implements MigrationInterface {
    name = 'AddContractContextEvents1794383495178'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "contract_context_events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "event_id" uuid NOT NULL, "contract_id" uuid NOT NULL, "tenant_user_id" uuid, "event_type" character varying(100) NOT NULL, "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL, "event_data" jsonb NOT NULL, "applied_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_44bd69dd577f09d08bc9507455a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_contract_context_events_contract_pending" ON "contract_context_events"  ("contract_id", "applied_at", "occurred_at") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_contract_context_events_event_id" ON "contract_context_events"  ("event_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."UQ_contract_context_events_event_id"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_contract_context_events_contract_pending"`);
        await queryRunner.query(`DROP TABLE "contract_context_events"`);
    }

}
