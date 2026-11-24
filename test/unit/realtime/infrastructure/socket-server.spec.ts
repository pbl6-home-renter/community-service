import { type HttpAdapterHost } from '@nestjs/core';
import { type Socket } from 'socket.io';
import {
  SocketServer,
  notificationUserRoom,
  userRoom,
} from 'modules/realtime/infrastructure/socket-server';
import { type AccessTokenVerifier } from 'shared/infrastructure/security/access-token-verifier.service';
import { UserRole } from 'shared/domain/enums/user-role.enum';
import { UserStatus } from 'shared/domain/enums/user-status.enum';
import { generateUuid } from 'shared/domain/value-objects/uuid.vo';

const userId = generateUuid();
const token = `header.${Buffer.from(
  JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }),
).toString('base64url')}.signature`;

jest.mock('@nestjs/core', () => ({ HttpAdapterHost: class {} }));
jest.mock('jose', () => ({
  decodeJwt: () => ({ exp: Math.floor(Date.now() / 1000) + 60 }),
}));
jest.mock(
  'shared/infrastructure/security/access-token-verifier.service',
  () => ({
    AccessTokenVerifier: class {},
  }),
);

function setup(status: UserStatus) {
  const joined = new Set<string>();
  const client = {
    handshake: { headers: {}, auth: { token } },
    data: {},
    join: jest.fn(async (room: string) => {
      joined.add(room);
    }),
    once: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  } as unknown as Socket;
  const verifier = {
    verify: jest.fn(async () => ({
      id: userId,
      role: UserRole.TENANT,
      status,
    })),
  } as unknown as AccessTokenVerifier;
  const server = new SocketServer({} as HttpAdapterHost, verifier);
  return { client, joined, server };
}

describe('SocketServer account status isolation', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('joins active accounts to both notification and regular user rooms', async () => {
    const { client, joined, server } = setup(UserStatus.ACTIVE);
    await (
      server as unknown as { authenticate: (socket: Socket) => Promise<void> }
    ).authenticate(client);

    expect(joined).toEqual(
      new Set([notificationUserRoom(userId), userRoom(userId)]),
    );
    expect(client.data.userId).toBe(userId);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('joins locked accounts only to the notification room', async () => {
    const { client, joined, server } = setup(UserStatus.LOCKED);
    await (
      server as unknown as { authenticate: (socket: Socket) => Promise<void> }
    ).authenticate(client);

    expect(joined).toEqual(new Set([notificationUserRoom(userId)]));
    expect(client.data.userId).toBeUndefined();
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects accounts awaiting verification', async () => {
    const { client, joined, server } = setup(UserStatus.PENDING_VERIFICATION);
    await (
      server as unknown as { authenticate: (socket: Socket) => Promise<void> }
    ).authenticate(client);

    expect(joined.size).toBe(0);
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
