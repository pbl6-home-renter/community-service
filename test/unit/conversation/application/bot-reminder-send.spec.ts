import { BotReminderSendCommand } from 'modules/conversation/application/commands/bot-reminder-send/bot-reminder-send.command';
import { BotReminderSendCommandHandler } from 'modules/conversation/application/commands/bot-reminder-send/bot-reminder-send.command.handler';
import { TenancyBotReminderResourceService } from 'modules/conversation/infrastructure/services/tenancy-bot-reminder-resource.service';
import { ConversationEntity } from 'modules/conversation/domain/entities/conversation.entity';
import { ConversationContextType } from 'modules/conversation/domain/enums/conversation-context-type.enum';
import { ConversationKind } from 'modules/conversation/domain/enums/conversation-kind.enum';
import { ConversationMemberEntity } from 'modules/conversation-member/domain/entities/conversation-member.entity';
import { ConversationMemberRole } from 'modules/conversation-member/domain/enums/conversation-member-role.enum';
import { ConversationParticipantType } from 'modules/conversation-member/domain/enums/conversation-participant-type.enum';
import { MessageEntity } from 'modules/message/domain/entities/message.entity';
import { MessageType } from 'modules/message/domain/enums/message-type.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';
import { TransactionContext } from 'shared/domain/repositories/transaction-context';

describe('manual bot reminders', () => {
  const context: TransactionContext = { kind: 'transaction' };
  const contractId = generateUuid();
  const userId = generateUuid();
  const invoiceId = generateUuid();
  const key = generateUuid();
  const conversation = ConversationEntity.create({
    kind: ConversationKind.GROUP,
    contextType: ConversationContextType.CONTRACT,
    contextId: contractId,
  });
  const user = ConversationMemberEntity.create({
    conversationId: conversation.id,
    participantType: ConversationParticipantType.USER,
    userId,
    displayName: 'Landlord',
    role: ConversationMemberRole.ADMIN,
  });
  const bot = ConversationMemberEntity.create({
    conversationId: conversation.id,
    participantType: ConversationParticipantType.SYSTEM,
    systemParticipantKey: 'bot_reminder',
    displayName: 'Rentify',
    role: ConversationMemberRole.SYSTEM,
  });
  const command = new BotReminderSendCommand(
    conversation.id,
    userId,
    'token',
    'invoice',
    invoiceId,
    key,
  );

  const setup = () => {
    let saved: MessageEntity | null = null;
    const conversations = {
      findById: jest.fn(async () => conversation),
      findByIdForUpdate: jest.fn(async () => conversation),
    };
    const members = {
      findByParticipant: jest.fn(async (_id, identity) =>
        identity.participantType === 'user' ? user : bot,
      ),
      findByParticipantForUpdate: jest.fn(async (_id, identity) =>
        identity.participantType === 'user' ? user : bot,
      ),
      findActiveUserMembersForUpdate: jest.fn(async () => [user]),
      save: jest.fn(),
    };
    const messages = {
      findByIdempotencyKey: jest.fn(async () => saved),
      nextSequenceForUpdate: jest.fn(async () => '1'),
      save: jest.fn(async (message: MessageEntity) => {
        saved = message;
      }),
    };
    const resources = { render: jest.fn(async () => 'Invoice notice') };
    const uow = {
      run: jest.fn(async (fn: (ctx: TransactionContext) => Promise<unknown>) =>
        fn(context),
      ),
    };
    const realtime = { messageCreated: jest.fn(), messageReceived: jest.fn() };
    const push = { notify: jest.fn() };
    const handler = new BotReminderSendCommandHandler(
      conversations as never,
      members as never,
      messages as never,
      resources,
      uow as never,
      realtime as never,
      push as never,
    );
    return {
      handler,
      conversations,
      members,
      messages,
      resources,
      realtime,
      push,
    };
  };

  it('stores a bot message and only emits side effects once for a retry', async () => {
    const f = setup();
    const first = await f.handler.execute(command);
    const second = await f.handler.execute(command);
    expect(first.message.type).toBe(MessageType.BOT);
    expect(second.message.id).toBe(first.message.id);
    expect(f.messages.save).toHaveBeenCalledTimes(1);
    expect(f.resources.render).toHaveBeenCalledTimes(1);
    expect(f.realtime.messageCreated).toHaveBeenCalledTimes(1);
    expect(f.push.notify).toHaveBeenCalledTimes(1);
  });

  it('rejects a different resource with the same key', async () => {
    const f = setup();
    await f.handler.execute(command);
    await expect(
      f.handler.execute(
        new BotReminderSendCommand(
          conversation.id,
          userId,
          'token',
          'invoice',
          generateUuid(),
          key,
        ),
      ),
    ).rejects.toThrow();
    expect(f.messages.save).toHaveBeenCalledTimes(1);
  });

  it('does not read or save when caller is not a member', async () => {
    const f = setup();
    f.members.findByParticipant.mockResolvedValueOnce(null as never);
    await expect(f.handler.execute(command)).rejects.toThrow();
    expect(f.resources.render).not.toHaveBeenCalled();
    expect(f.messages.save).not.toHaveBeenCalled();
  });

  it('does not write or emit when Tenancy is unavailable', async () => {
    const f = setup();
    f.resources.render.mockRejectedValueOnce(new Error('unavailable'));
    await expect(f.handler.execute(command)).rejects.toThrow('unavailable');
    expect(f.messages.save).not.toHaveBeenCalled();
    expect(f.realtime.messageCreated).not.toHaveBeenCalled();
  });

  it('rejects a conversation with no contract context before reading the resource', async () => {
    const f = setup();
    const unrelated = ConversationEntity.create({
      kind: ConversationKind.GROUP,
    });
    f.conversations.findById.mockResolvedValueOnce(unrelated);
    await expect(f.handler.execute(command)).rejects.toThrow();
    expect(f.resources.render).not.toHaveBeenCalled();
    expect(f.messages.save).not.toHaveBeenCalled();
  });

  it('checks invoice context and issued status, and forwards the caller token', async () => {
    const get = jest.fn().mockResolvedValue({
      id: invoiceId,
      contractId,
      invoiceStatus: 'issued',
      code: 'INV-1',
      period: '2026-10',
      totalAmount: '1000000.00',
    });
    const resource = new TenancyBotReminderResourceService({ get });
    const message = await resource.render(
      'invoice',
      invoiceId,
      contractId,
      'token',
    );
    expect(message).toContain('1.000.000 đồng');
    expect(get).toHaveBeenCalledWith(
      'tenancy',
      `/api/v1/invoices/${invoiceId}`,
      { bearerToken: 'token' },
    );
    await expect(
      resource.render('invoice', invoiceId, generateUuid(), 'token'),
    ).rejects.toThrow();
    get.mockResolvedValueOnce({
      id: invoiceId,
      contractId,
      invoiceStatus: 'pending',
      code: 'INV-1',
      period: '2026-10',
      totalAmount: '1',
    });
    await expect(
      resource.render('invoice', invoiceId, contractId, 'token'),
    ).rejects.toThrow();
  });

  it('only renders the active matching contract and propagates authorization failure', async () => {
    const get = jest
      .fn()
      .mockResolvedValue({
        id: contractId,
        status: 'active',
        endDate: '2026-12-30',
      });
    const resource = new TenancyBotReminderResourceService({ get });
    expect(
      await resource.render(
        'contract_expiring',
        contractId,
        contractId,
        'token',
      ),
    ).toContain('30/12/2026');
    await expect(
      resource.render('contract_expiring', generateUuid(), contractId, 'token'),
    ).rejects.toThrow();
    get.mockResolvedValueOnce({
      id: contractId,
      status: 'terminated',
      endDate: '2026-12-30',
    });
    await expect(
      resource.render('contract_expiring', contractId, contractId, 'token'),
    ).rejects.toThrow();
    get.mockRejectedValueOnce(new Error('forbidden'));
    await expect(
      resource.render('contract_expiring', contractId, contractId, 'token'),
    ).rejects.toThrow('forbidden');
  });
});
