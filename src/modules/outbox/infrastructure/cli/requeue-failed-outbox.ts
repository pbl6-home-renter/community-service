/**
 * Operator tool: moves FAILED outbox messages back to PENDING so the relay retries them
 * and the aggregate they block is unblocked. v1 has no admin API, so this is the way.
 *
 *   npm run outbox:requeue -- <message-id> [<message-id> ...]
 *   npm run outbox:requeue:prod -- <message-id> ...   (inside the container, from dist)
 */
import { AppDataSource } from 'shared/infrastructure/database/data-source';
import { Uuid } from 'shared/domain/value-objects/uuid.vo';
import { OutboxTypeormEntity } from '../persistence/outbox.typeorm-entity';
import { TypeOrmOutboxRepository } from '../persistence/outbox.repository';

async function main(): Promise<void> {
  const ids = process.argv.slice(2) as Uuid[];
  if (ids.length === 0) {
    console.error('Usage: outbox:requeue -- <message-id> [<message-id> ...]');
    process.exitCode = 1;
    return;
  }

  const dataSource = await AppDataSource.initialize();
  try {
    const repository = new TypeOrmOutboxRepository(
      dataSource.getRepository(OutboxTypeormEntity),
    );
    for (const id of ids) {
      const requeued = await repository.requeueFailed(id);
      console.log(
        requeued ? `requeued ${id}` : `skipped ${id} (not found or not FAILED)`,
      );
      if (!requeued) process.exitCode = 1;
    }
  } finally {
    await dataSource.destroy();
  }
}

void main();
