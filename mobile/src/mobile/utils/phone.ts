export const MOBILE_PHONE_PATTERN = /^09\d{9}$/;
export const MOBILE_PHONE_VALIDATION_MESSAGE = 'Use 11 digits starting with 09.';

export const normalizeMobilePhoneNumber = (value: string) =>
  String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 11);

export const isValidMobilePhoneNumber = (value: string) =>
  MOBILE_PHONE_PATTERN.test(normalizeMobilePhoneNumber(value));

export const areMobilePhoneNumbersEqual = (
  left: string,
  right: string
) =>
  normalizeMobilePhoneNumber(left) === normalizeMobilePhoneNumber(right);
