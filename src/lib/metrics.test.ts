import { describe, expect, it } from 'vitest';
import type { MonthRow } from './ledger';
import { categoryTotals, monthExpenses, selectRange, summarize } from './metrics';

const row = (month: string, rent: number, expenses: Record<string, number>): MonthRow => ({ month, rent, expenses });

const rows: MonthRow[] = [
  row('2026-01', 1000, { TAXES: 200, HOA: 100 }),
  row('2026-02', 1000, { TAXES: 0, HOA: 1500 }),
  row('2026-03', 1200, { TAXES: 200, HOA: -100 }),
];

describe('metrics', () => {
  it('selectRange keeps the most recent N months', () => {
    expect(selectRange(rows, 6)).toEqual(rows);
    expect(selectRange(rows, 'all')).toEqual(rows);
    const many = Array.from({ length: 14 }, (_, i) => row(`2025-${i}`, i, {}));
    expect(selectRange(many, 12).map((r) => r.rent)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(selectRange(many, 6).map((r) => r.rent)).toEqual([8, 9, 10, 11, 12, 13]);
  });

  it('monthExpenses sums every category including negatives', () => {
    expect(monthExpenses(rows[2]!)).toBe(100);
  });

  it('summarize totals rent, expenses, net and average monthly net', () => {
    expect(summarize(rows)).toEqual({ rent: 3200, expenses: 1900, net: 1300, avgNet: 1300 / 3 });
  });

  it('summarize reports a negative net when expenses exceed rent', () => {
    expect(summarize([rows[1]!])).toEqual({ rent: 1000, expenses: 1500, net: -500, avgNet: -500 });
  });

  it('summarize of no months is all zeros, not NaN', () => {
    expect(summarize([])).toEqual({ rent: 0, expenses: 0, net: 0, avgNet: 0 });
  });

  it('categoryTotals sums each category across months', () => {
    expect(categoryTotals(rows, ['TAXES', 'HOA'])).toEqual({ TAXES: 400, HOA: 1500 });
  });
});
