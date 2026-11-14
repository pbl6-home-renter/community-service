import { NotificationListQuery } from 'modules/notification/application/queries/notification-list.query';
import { NotificationListQueryHandler } from 'modules/notification/application/queries/notification-list.query.handler';
import { NotificationPageQueryPort } from 'modules/notification/application/ports/notification-page-query.port';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('NotificationListQueryHandler', () => {
  it('passes the user, cursor, page size and unread filter to the read port', async () => {
    const query = new NotificationListQuery(
      generateUuid(),
      'next-page-cursor',
      30,
      true,
    );
    const result = {
      data: [],
      pagination: {
        type: 'cursor' as const,
        pageSize: query.pageSize,
        nextCursor: null,
        hasNextPage: false,
      },
    };
    const pages: NotificationPageQueryPort = {
      findPage: jest.fn(async () => result),
    };
    const handler = new NotificationListQueryHandler(pages);

    await expect(handler.execute(query)).resolves.toBe(result);
    expect(pages.findPage).toHaveBeenCalledWith(query);
  });
});
