import { describe, expect, it } from 'bun:test';
import { IsString, validate } from 'class-validator';
import { MatchesProperty } from './matches-property.validator';

class Sample {
  @IsString()
  password: string;

  @MatchesProperty('password')
  confirmPassword: string;
}

function sampleOf(password: unknown, confirmPassword: unknown) {
  const sample = new Sample();

  sample.password = password as string;
  sample.confirmPassword = confirmPassword as string;

  return sample;
}

describe('MatchesProperty', () => {
  it('accepts two equal values', async () => {
    const errors = await validate(sampleOf('secret', 'secret'));

    expect(errors).toHaveLength(0);
  });

  it('rejects two different values', async () => {
    const errors = await validate(sampleOf('secret', 'other'));

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('confirmPassword');
  });

  it('names both fields in the message', async () => {
    const errors = await validate(sampleOf('secret', 'other'));

    expect(Object.values(errors[0].constraints ?? {})).toContain(
      'confirmPassword must match password',
    );
  });

  it('rejects a missing confirmation', async () => {
    const errors = await validate(sampleOf('secret', undefined));

    expect(errors).toHaveLength(1);
  });

  it('leaves the missing-password complaint to the password field', async () => {
    const errors = await validate(sampleOf(undefined, undefined));

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('password');
  });

  it('does not treat a different type as equal', async () => {
    const errors = await validate(sampleOf('123456', 123456));

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('confirmPassword');
  });
});
