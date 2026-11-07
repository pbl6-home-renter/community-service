import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleMessageMedia1794044531724 implements MigrationInterface {
  name = 'EnforceSingleMessageMedia1794044531724';

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "CHK_messages_single_media" CHECK (cardinality(media_ids) <= 1)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "CHK_messages_single_media"`);
    }

}
