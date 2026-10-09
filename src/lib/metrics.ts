import type { MonthRow } from './ledger';

export type Range = 6 | 12 | 'all';

export function selectRange(rows: MonthRow[], range: Range): MonthRow[] {
  return range === 'all' ? rows : rows.slice(-range);
}

export function monthExpenses(row: MonthRow): number {
  return Object.values(row.expenses).reduce((a, b) => a + b, 0);
}

export type Summary = { rent: number; expenses: number; net: number; avgNet: number };

export function summarize(rows: MonthRow[]): Summary {
  const rent = rows.reduce((sum, r) => sum + r.rent, 0);
  const expenses = rows.reduce((sum, r) => sum + monthExpenses(r), 0);
  const net = rent - expenses;
  return { rent, expenses, net, avgNet: rows.length ? net / rows.length : 0 };
}

export function categoryTotals(rows: MonthRow[], categories: string[]): Record<string, number> {
  return Object.fromEntries(
    categories.map((c) => [c, rows.reduce((sum, r) => sum + (r.expenses[c] ?? 0), 0)]),
  );
}
