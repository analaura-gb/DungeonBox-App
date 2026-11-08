import {
  buildMessage,
  ValidateBy,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function MatchesProperty(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return ValidateBy(
    {
      name: 'matchesProperty',
      constraints: [property],
      validator: {
        validate: (value: unknown, args?: ValidationArguments) =>
          value === (args?.object as Record<string, unknown>)[property],
        defaultMessage: buildMessage(
          (eachPrefix) => `${eachPrefix}$property must match $constraint1`,
          validationOptions,
        ),
      },
    },
    validationOptions,
  );
}
