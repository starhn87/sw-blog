const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(value) {
  return Date.parse(`${value}T00:00:00Z`) / DAY_MS;
}

export function coverageForRange(start, end, startedAt) {
  const rangeStart = dayNumber(start);
  const rangeEnd = dayNumber(end);
  const collectionStart = dayNumber(startedAt);
  const total = Math.max(0, rangeEnd - rangeStart);
  const covered = Math.min(
    total,
    Math.max(0, rangeEnd - Math.max(rangeStart, collectionStart)),
  );

  return { covered, total, complete: covered === total };
}

export function ratePercent(numerator, denominator) {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}

export function percentagePointChange(current, previous) {
  if (current === null || previous === null) return null;
  return current - previous;
}
