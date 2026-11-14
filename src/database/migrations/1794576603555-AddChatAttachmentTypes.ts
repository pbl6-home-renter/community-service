import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatAttachmentTypes1794576603555 implements MigrationInterface {
    name = 'AddChatAttachmentTypes1794576603555'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "CHK_messages_type"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "CHK_messages_type_v2" CHECK (message_type IN ('text', 'image', 'video', 'file', 'system', 'bot'))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "CHK_messages_type_v2"`);
        await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "CHK_messages_type" CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'system'::character varying, 'bot'::character varying])::text[])))`);
    }

}
