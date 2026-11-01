import { SetMetadata } from '@nestjs/common';

export const RESPONSE_CODE_METADATA_KEY = 'response_code_metadata_key';

/**
 * Decorator to specify a business response code for success responses
 * Example: @ResponseCode('USER_LOGGED_IN')
 */
export const ResponseCode = (code: string) =>
  SetMetadata(RESPONSE_CODE_METADATA_KEY, code);
