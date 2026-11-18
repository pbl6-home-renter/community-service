import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIssueReportsTable1795017701687 implements MigrationInterface {
  name = 'CreateIssueReportsTable1795017701687';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "issue_reports" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "room_id" uuid NOT NULL, "building_id" uuid NOT NULL, "contract_id" uuid NOT NULL, "creator_id" uuid NOT NULL, "title" character varying(255) NOT NULL, "description" character varying(500), "category" character varying(20) NOT NULL, "urgency" character varying(20) NOT NULL, "status" character varying(20) NOT NULL, "closed_at" TIMESTAMP WITH TIME ZONE, "assigned_to" character varying(500), "repair_cost" integer, "resolution_note" character varying(500), CONSTRAINT "CHK_issue_reports_urgency" CHECK (urgency IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')), CONSTRAINT "CHK_issue_reports_category" CHECK (category IN ('PLUMBING', 'ELECTRICAL', 'APPLIANCE', 'STRUCTURAL', 'SECURITY', 'OTHER')), CONSTRAINT "CHK_issue_reports_description" CHECK (description IS NULL OR length(btrim(description)) BETWEEN 1 AND 500), CONSTRAINT "CHK_issue_reports_title" CHECK (length(btrim(title)) BETWEEN 1 AND 255), CONSTRAINT "CHK_issue_reports_closed_at" CHECK ((status IN ('resolved', 'cancelled')) = (closed_at IS NOT NULL)), CONSTRAINT "CHK_issue_reports_status" CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')), CONSTRAINT "PK_d0f5b1e6e4853c6c5265b235e5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issue_reports_room_created" ON "issue_reports"  ("room_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_issue_reports_contract_created" ON "issue_reports"  ("contract_id", "created_at") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_issue_reports_contract_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_issue_reports_room_created"`,
    );
    await queryRunner.query(`DROP TABLE "issue_reports"`);
  }
}
