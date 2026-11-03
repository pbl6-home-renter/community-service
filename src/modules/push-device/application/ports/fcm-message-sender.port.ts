import { PushMessage } from './push-delivery.port';

/** `invalid-token`: FCM will never accept this token again; revoke the device. */
export type FcmMessageSendResult = 'sent' | 'invalid-token';

export interface FcmMessageSenderPort {
  isEnabled(): boolean;
  send(token: string, message: PushMessage): Promise<FcmMessageSendResult>;
}
