export const JEWELRY_TABLE_MAX_ROWS = 90;

export function jewelryTableDisplay<T>(rows: T[], maxRows = JEWELRY_TABLE_MAX_ROWS) {
  const total = rows.length;
  if (total <= maxRows) return { rows, hidden: 0, total };
  return { rows: rows.slice(-maxRows), hidden: total - maxRows, total };
}
