import { registerDecorator, ValidationOptions } from 'class-validator';

import { isValidUuid } from 'shared/domain/value-objects/uuid.vo';

export function IsUuid(
  message: string = 'INVALID_UUID',
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUuid',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) {
            return true;
          }
          return typeof value === 'string' && isValidUuid(value);
        },
        defaultMessage() {
          return message;
        },
      },
    });
  };
}
