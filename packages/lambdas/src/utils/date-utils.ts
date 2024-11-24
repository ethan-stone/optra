export function isInPreviousMonth(dateToCheck: Date, comparedTo: Date) {
  const checkDate = new Date(dateToCheck);
  const compareDate = new Date(comparedTo);

  // First approach: Compare year and mont

  return (
    checkDate.getUTCMonth() === (compareDate.getUTCMonth() - 1 + 12) % 12 &&
    (checkDate.getUTCFullYear() === compareDate.getUTCFullYear() ||
      (checkDate.getUTCFullYear() === compareDate.getUTCFullYear() - 1 &&
        compareDate.getUTCMonth() === 0))
  );
}
