import { type Socket } from 'socket.io';
import { ChatGateway } from 'modules/conversation/infrastructure/realtime/chat.gateway';
import { ConversationSocketAccessService } from 'modules/conversation/application/queries/conversation-socket-access.service';
import { SocketServer } from 'modules/realtime/infrastructure/socket-server';
import { generateUuid, Uuid } from 'shared/domain/value-objects/uuid.vo';

jest.mock('modules/realtime/infrastructure/socket-server', () => ({
  SocketServer: class {},
  userRoom: (id: string) => `user:${id}`,
}));

function setup(options: { joined: boolean; active: boolean }) {
  const conversationId = generateUuid();
  const userId = generateUuid();
  const room = `conversation:${conversationId}`;
  const roomEmit = jest.fn();
  const rooms = new Set<string>(options.joined ? [room] : []);
  const client = {
    data: { userId },
    rooms,
    to: jest.fn(() => ({ emit: roomEmit })),
    leave: jest.fn(async (name: string) => {
      rooms.delete(name);
    }),
  } as unknown as Socket;
  const socket = {
    onConnection: jest.fn(),
    emit: jest.fn(),
    leaveRoom: jest.fn(),
  } as unknown as SocketServer;
  const access = {
    canJoin: jest.fn(async () => options.active),
  } as unknown as ConversationSocketAccessService;
  const gateway = new ChatGateway(socket, access);
  return { gateway, client, socket, roomEmit, conversationId, userId, room };
}

describe('ChatGateway typing', () => {
  it('relays typing to the other sockets of the room with the authenticated user id', async () => {
    const { gateway, client, roomEmit, conversationId, userId, room } = setup({
      joined: true,
      active: true,
    });

    const ack = await gateway.typing(client, {
      conversationId,
      isTyping: true,
      userId: generateUuid(),
    } as never);

    expect(ack).toEqual({ ok: true, code: 'SENT', conversationId });
    expect(client.to).toHaveBeenCalledWith(room);
    expect(roomEmit).toHaveBeenCalledWith('conversation:typing', {
      conversationId,
      userId,
      isTyping: true,
    });
  });

  it('rejects a socket that has not joined the room', async () => {
    const { gateway, client, roomEmit, conversationId } = setup({
      joined: false,
      active: true,
    });

    const ack = await gateway.typing(client, { conversationId, isTyping: true });

    expect(ack).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('removes a socket whose membership was revoked and does not relay', async () => {
    const { gateway, client, roomEmit, conversationId, room } = setup({
      joined: true,
      active: false,
    });

    const ack = await gateway.typing(client, { conversationId, isTyping: true });

    expect(ack).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(client.leave).toHaveBeenCalledWith(room);
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it.each([
    [{ conversationId: 'not-a-uuid', isTyping: true }, 'INVALID_CONVERSATION_ID'],
    [{ conversationId: generateUuid(), isTyping: 'yes' }, 'INVALID_PAYLOAD'],
  ])('validates the payload %p', async (request, code) => {
    const { gateway, client, roomEmit } = setup({ joined: true, active: true });

    const ack = await gateway.typing(client, request);

    expect(ack).toEqual({ ok: false, code });
    expect(roomEmit).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated socket', async () => {
    const { gateway, client, conversationId } = setup({
      joined: true,
      active: true,
    });
    client.data.userId = undefined;

    const ack = await gateway.typing(client, { conversationId, isTyping: false });

    expect(ack).toEqual({ ok: false, code: 'UNAUTHORIZED' });
  });
});

describe('ChatGateway read receipts', () => {
  it('emits member-read to the conversation room', () => {
    const { gateway, socket, conversationId } = setup({
      joined: true,
      active: true,
    });
    const reader = generateUuid() as Uuid;

    gateway.memberReadUpdated(conversationId, reader, '42');

    expect(socket.emit).toHaveBeenCalledWith(
      `conversation:${conversationId}`,
      'conversation:member-read',
      { conversationId, userId: reader, lastReadSequence: '42' },
    );
  });
});
