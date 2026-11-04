import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommunityTables1793802536641 implements MigrationInterface {
  name = 'AddCommunityTables1793802536641';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "conversations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "kind" character varying(20) NOT NULL, "context_type" character varying(20), "context_id" uuid, "direct_pair_key" character varying(73), "title" character varying(255), "avatar_media_id" uuid, "created_by_user_id" uuid, CONSTRAINT "CHK_conversations_title_non_empty" CHECK (title IS NULL OR length(btrim(title)) > 0), CONSTRAINT "CHK_conversations_kind_direct_pair_key" CHECK ((kind = 'direct' AND direct_pair_key IS NOT NULL) OR (kind = 'group' AND direct_pair_key IS NULL)), CONSTRAINT "CHK_conversations_context_pair" CHECK ((context_type IS NULL AND context_id IS NULL) OR (context_type IS NOT NULL AND context_id IS NOT NULL)), CONSTRAINT "CHK_conversations_context_type" CHECK (context_type IS NULL OR context_type IN ('contract', 'building')), CONSTRAINT "PK_ee34f4f7ced4ec8681f26bf04ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversations_context" ON "conversations"  ("context_type", "context_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversations_direct_pair_key" ON "conversations"  ("direct_pair_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "conversation_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "conversation_id" uuid NOT NULL, "participant_type" character varying(20) NOT NULL, "user_id" uuid, "display_name" character varying(254) NOT NULL, "system_participant_key" character varying(100), "role" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'active', "joined_at" TIMESTAMP WITH TIME ZONE NOT NULL, "left_at" TIMESTAMP WITH TIME ZONE, "left_sequence" bigint, "last_read_sequence" bigint NOT NULL DEFAULT '0', CONSTRAINT "CHK_conversation_members_sequences_non_negative" CHECK (last_read_sequence >= 0 AND (left_sequence IS NULL OR left_sequence >= 0)), CONSTRAINT "CHK_conversation_members_status_boundary" CHECK ((status = 'active' AND left_at IS NULL AND left_sequence IS NULL) OR (status = 'read_only' AND left_at IS NOT NULL AND left_sequence IS NOT NULL)), CONSTRAINT "CHK_conversation_members_participant_role" CHECK ((participant_type = 'user' AND user_id IS NOT NULL AND system_participant_key IS NULL AND role IN ('admin', 'member')) OR (participant_type = 'system' AND user_id IS NULL AND system_participant_key IS NOT NULL AND role = 'system')), CONSTRAINT "PK_33146a476696a973a14d931e675" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_members_conversation_status" ON "conversation_members"  ("conversation_id", "status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversation_members_system_participant" ON "conversation_members"  ("conversation_id", "system_participant_key") WHERE "participant_type" = 'system' AND "system_participant_key" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_conversation_members_user" ON "conversation_members"  ("conversation_id", "user_id") WHERE "participant_type" = 'user' AND "user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_deliveries" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "recipient_email" character varying(320) NOT NULL, "subject" character varying(255) NOT NULL, "status" character varying(20) NOT NULL, "failure_reason" text, "sent_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_aa4e94683dafee7c55aaeb9f59d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_deliveries_created_at" ON "email_deliveries"  ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "conversation_id" uuid NOT NULL, "sender_member_id" uuid NOT NULL, "sender_name_snapshot" character varying(254) NOT NULL, "client_message_id" uuid, "message_type" character varying(20) NOT NULL, "content" character varying(4000), "media_id" uuid, "payload" jsonb, "sequence" bigint NOT NULL, CONSTRAINT "CHK_messages_type" CHECK (message_type IN ('text', 'image', 'system', 'bot')), CONSTRAINT "CHK_messages_sequence_positive" CHECK (sequence > 0), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_conversation_created_at" ON "messages"  ("conversation_id", "sequence") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_messages_sender_client_id" ON "messages"  ("sender_member_id", "client_message_id") WHERE "client_message_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_messages_conversation_sequence" ON "messages"  ("conversation_id", "sequence") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "recipient_user_id" uuid NOT NULL, "source_service" character varying(100) NOT NULL, "event_id" uuid NOT NULL, "type" character varying(20) NOT NULL, "title" character varying(255) NOT NULL, "body" character varying(2000) NOT NULL, "deep_link" character varying(2048), "data" jsonb, "read_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_notifications_recipient_created" ON "notifications"  ("recipient_user_id", "created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notifications_event_recipient" ON "notifications"  ("source_service", "event_id", "recipient_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "user_id" uuid NOT NULL, "category" character varying(20) NOT NULL, "push_enabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_notification_preferences_user_category" ON "notification_preferences"  ("user_id", "category") `,
    );
    await queryRunner.query(
      `CREATE TABLE "push_devices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "is_deleted" boolean NOT NULL DEFAULT false, "user_id" uuid NOT NULL, "token" character varying(512) NOT NULL, "platform" character varying(20) NOT NULL, "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_46b68decfd1164e1a796f48dc4a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_push_devices_user_active" ON "push_devices"  ("user_id", "revoked_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_push_devices_token" ON "push_devices"  ("token") `,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" ADD CONSTRAINT "FK_conversation_members_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_sender_member_id" FOREIGN KEY ("sender_member_id") REFERENCES "conversation_members"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_conversation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_sender_member_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_members" DROP CONSTRAINT "FK_conversation_members_conversation_id"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_push_devices_token"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_push_devices_user_active"`,
    );
    await queryRunner.query(`DROP TABLE "push_devices"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_notification_preferences_user_category"`,
    );
    await queryRunner.query(`DROP TABLE "notification_preferences"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_notifications_event_recipient"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_notifications_recipient_created"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_messages_conversation_sequence"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_messages_sender_client_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_messages_conversation_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_email_deliveries_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "email_deliveries"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversation_members_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversation_members_system_participant"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_members_conversation_status"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_members"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_conversations_direct_pair_key"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_conversations_context"`);
    await queryRunner.query(`DROP TABLE "conversations"`);
  }
}
