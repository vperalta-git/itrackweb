export const toDate = (value?: Date | string | null) => {
  if (!value) {
    return new Date(0);
  }

  if (value instanceof Date) {
    return value;
  }

  return new Date(value);
};

export const sortDatesDesc = (
  left: Date | string,
  right: Date | string
) => toDate(right).getTime() - toDate(left).getTime();
