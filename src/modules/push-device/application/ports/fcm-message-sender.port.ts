import { PushMessage } from './push-delivery.port';

export type FcmMessageSendResult = 'sent' | 'unregistered' | 'disabled';

export interface FcmMessageSenderPort {
  send(token: string, message: PushMessage): Promise<FcmMessageSendResult>;
}
