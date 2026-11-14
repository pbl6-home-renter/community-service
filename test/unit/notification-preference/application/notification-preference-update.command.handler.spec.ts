import { NotificationPreferenceUpdateCommand } from 'modules/notification-preference/application/commands/notification-preference-update.command';
import { NotificationPreferenceUpdateCommandHandler } from 'modules/notification-preference/application/commands/notification-preference-update.command.handler';
import { NotificationPreferenceRepository } from 'modules/notification-preference/domain/repositories/notification-preference.repository';
import { NotificationCategory } from 'modules/notification-preference/domain/enums/notification-category.enum';
import { IUnitOfWork } from 'shared/application/ports/unit-of-work.port';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';
import { ValidationException } from 'shared/domain/exceptions/validation.exception';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

describe('NotificationPreferenceUpdateCommandHandler', () => {
  it('replaces the complete preference set within one transaction', async () => {
    const userId = generateUuid();
    const context: TransactionContext = { kind: 'transaction' };
    const values = [
      { type: NotificationCategory.CHAT, pushEnabled: false },
      { type: NotificationCategory.INVOICE, pushEnabled: true },
      { type: NotificationCategory.ISSUE, pushEnabled: false },
      { type: NotificationCategory.SYSTEM, pushEnabled: true },
    ];
    const preferences = {
      replaceAll: jest.fn(async (_userId, _values, _at, passedContext) => {
        expect(passedContext).toBe(context);
      }),
    } as unknown as NotificationPreferenceRepository;
    const unitOfWork: IUnitOfWork = {
      run: jest.fn(async (work) => work(context)),
    };
    const handler = new NotificationPreferenceUpdateCommandHandler(
      preferences,
      unitOfWork,
    );

    const updatedAt = await handler.execute(
      new NotificationPreferenceUpdateCommand(userId, values),
    );

    expect(updatedAt).toBeInstanceOf(Date);
    expect(preferences.replaceAll).toHaveBeenCalledWith(
      userId,
      {
        [NotificationCategory.CHAT]: false,
        [NotificationCategory.INVOICE]: true,
        [NotificationCategory.ISSUE]: false,
        [NotificationCategory.SYSTEM]: true,
      },
      updatedAt,
      context,
    );
  });

  it('requires one boolean value for every known category before starting a transaction', async () => {
    const preferences = {
      replaceAll: jest.fn(),
    } as unknown as NotificationPreferenceRepository;
    const unitOfWork: IUnitOfWork = { run: jest.fn() };
    const handler = new NotificationPreferenceUpdateCommandHandler(
      preferences,
      unitOfWork,
    );

    await expect(
      handler.execute(
        new NotificationPreferenceUpdateCommand(generateUuid(), [
          { type: NotificationCategory.CHAT, pushEnabled: true },
          { type: NotificationCategory.INVOICE, pushEnabled: true },
          { type: NotificationCategory.ISSUE, pushEnabled: true },
        ]),
      ),
    ).rejects.toThrow(ValidationException);
    await expect(
      handler.execute(
        new NotificationPreferenceUpdateCommand(generateUuid(), [
          { type: NotificationCategory.CHAT, pushEnabled: true },
          { type: NotificationCategory.CHAT, pushEnabled: false },
          { type: NotificationCategory.ISSUE, pushEnabled: true },
        ]),
      ),
    ).rejects.toThrow(ValidationException);
    expect(unitOfWork.run).not.toHaveBeenCalled();
    expect(preferences.replaceAll).not.toHaveBeenCalled();
  });
});
