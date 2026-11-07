import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageMediaIds1794042677741 implements MigrationInterface {
  name = 'AddMessageMediaIds1794042677741';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "media_ids" uuid array NOT NULL DEFAULT '{}'::uuid[]`,
    );
    await queryRunner.query(
      `UPDATE "messages" SET "media_ids" = CASE WHEN "media_id" IS NULL THEN '{}'::uuid[] ELSE ARRAY["media_id"] END`,
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "media_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD "media_id" uuid`);
    await queryRunner.query(
      `UPDATE "messages" SET "media_id" = "media_ids"[1]`,
    );
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "media_ids"`);
  }
}
