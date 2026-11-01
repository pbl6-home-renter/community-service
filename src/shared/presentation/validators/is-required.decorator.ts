import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsRequired(
  code: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRequired',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return value !== undefined && value !== null;
        },
        defaultMessage() {
          return code;
        },
      },
    });
  };
}
