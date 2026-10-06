import { isValid, parse } from 'date-fns';

const DATE_FALLBACK_FORMATS = ['MMMM d, yyyy', 'yyyy-MM-dd HH:mm', 'yyyy-MM-dd'];

const cloneDate = (value: Date) => new Date(value.getTime());

export const toDate = (
  value?: Date | string | number | null,
  fallback = new Date(0)
) => {
  if (value === null || value === undefined) {
    return cloneDate(fallback);
  }

  if (value instanceof Date) {
    return isValid(value) ? cloneDate(value) : cloneDate(fallback);
  }

  if (typeof value === 'number') {
    const parsedNumberDate = new Date(value);
    return isValid(parsedNumberDate) ? parsedNumberDate : cloneDate(fallback);
  }

  const normalizedValue = String(value).trim();

  if (!normalizedValue) {
    return cloneDate(fallback);
  }

  const nativeParsedDate = new Date(normalizedValue);

  if (isValid(nativeParsedDate)) {
    return nativeParsedDate;
  }

  for (const formatPattern of DATE_FALLBACK_FORMATS) {
    const parsedDate = parse(normalizedValue, formatPattern, new Date());

    if (isValid(parsedDate)) {
      return parsedDate;
    }
  }

  return cloneDate(fallback);
};

export const isDateValueValid = (value?: Date | string | number | null) => {
  const invalidFallback = new Date(Number.NaN);
  return !Number.isNaN(toDate(value, invalidFallback).getTime());
};

export const getFirstValidDate = (
  values: Array<Date | string | number | null | undefined>,
  fallback = new Date(Number.NaN)
) => {
  const firstValidValue = values.find((candidate) => isDateValueValid(candidate));
  return toDate(firstValidValue, fallback);
};

export const sortDatesDesc = (
  left: Date | string,
  right: Date | string
) => toDate(right).getTime() - toDate(left).getTime();
