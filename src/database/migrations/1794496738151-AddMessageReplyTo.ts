import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMessageReplyTo1794496738151 implements MigrationInterface {
  name = 'AddMessageReplyTo1794496738151';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD "reply_to_message_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_reply_to_message_id" FOREIGN KEY ("reply_to_message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_reply_to_message_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN "reply_to_message_id"`,
    );
  }
}
