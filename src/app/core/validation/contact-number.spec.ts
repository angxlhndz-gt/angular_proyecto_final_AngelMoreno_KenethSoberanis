import { CONTACT_NUMBER_PATTERN } from './contact-number';

describe('CONTACT_NUMBER_PATTERN', () => {
  it('accepts a formatted phone number with 7 to 15 digits', () => {
    expect(CONTACT_NUMBER_PATTERN.test('+502 5555-1234')).toBeTrue();
    expect(CONTACT_NUMBER_PATTERN.test('(502) 5555 1234')).toBeTrue();
    expect(CONTACT_NUMBER_PATTERN.test('1234567')).toBeTrue();
  });

  it('rejects values without enough actual digits or with misplaced plus signs', () => {
    expect(CONTACT_NUMBER_PATTERN.test('-------')).toBeFalse();
    expect(CONTACT_NUMBER_PATTERN.test('---1----')).toBeFalse();
    expect(CONTACT_NUMBER_PATTERN.test('123456')).toBeFalse();
    expect(CONTACT_NUMBER_PATTERN.test('502+5551234')).toBeFalse();
    expect(CONTACT_NUMBER_PATTERN.test('1234567890123456')).toBeFalse();
  });
});
