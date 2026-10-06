const MOBILE_PHONE_PATTERN = /^09\d{9}$/

export const MOBILE_PHONE_VALIDATION_MESSAGE =
  'Enter a valid mobile number like 09171234567 or +639171234567.'

export const normalizeMobilePhoneNumber = (value: string) => {
  const digits = String(value ?? '').replace(/\D/g, '')

  if (digits.startsWith('63')) {
    return `0${digits.slice(2)}`.slice(0, 11)
  }

  if (digits.startsWith('9')) {
    return `0${digits}`.slice(0, 11)
  }

  return digits.slice(0, 11)
}

export const isValidMobilePhoneNumber = (value: string) =>
  MOBILE_PHONE_PATTERN.test(normalizeMobilePhoneNumber(value))
