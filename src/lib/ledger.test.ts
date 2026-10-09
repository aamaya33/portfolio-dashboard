import { describe, expect, it } from 'vitest';
import { parseLedger } from './ledger';

describe('parseLedger', () => {
  it('parses currency formats, parentheses negatives and blank cells', () => {
    const csv = [
      'MONTHS,RENTS,TAXES,INSURANCE',
      'Jan 2026,"$1,200.50",(300),',
      'Feb 2026,1200,"$ 1,000",-50',
    ].join('\n');
    expect(parseLedger(csv)).toEqual({
      categories: ['TAXES', 'INSURANCE'],
      rows: [
        { month: '2026-01', rent: 1200.5, expenses: { TAXES: -300, INSURANCE: 0 } },
        { month: '2026-02', rent: 1200, expenses: { TAXES: 1000, INSURANCE: -50 } },
      ],
    });
  });

  it('normalizes every supported month format to YYYY-MM', () => {
    const csv = [
      'MONTHS,RENTS',
      'Jan 2025,1',
      'February 2025,1',
      '2025-03,1',
      '4/2025,1',
      '5/17/2025,1',
      'Sept 2025,1',
      'dec-2025,1',
    ].join('\n');
    expect(parseLedger(csv).rows.map((r) => r.month)).toEqual([
      '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-09', '2025-12',
    ]);
  });

  it('treats any extra column as an expense category, matching headers case-insensitively', () => {
    const csv = [' months , Rents ,Pest Control,  Lawn ,', '2026-01,1000,45,80,'].join('\n');
    const ledger = parseLedger(csv);
    expect(ledger.categories).toEqual(['Pest Control', 'Lawn']);
    expect(ledger.rows[0]).toEqual({ month: '2026-01', rent: 1000, expenses: { 'Pest Control': 45, Lawn: 80 } });
  });

  it('skips fully blank rows and a trailing TOTAL row', () => {
    const csv = [
      'MONTHS,RENTS,TAXES',
      'Jan 2026,1000,100',
      ',,',
      '',
      'Feb 2026,1000,100',
      'TOTAL,2000,200',
      '',
    ].join('\n');
    expect(parseLedger(csv).rows.map((r) => r.month)).toEqual(['2026-01', '2026-02']);
  });

  it('sorts rows chronologically regardless of sheet order', () => {
    const csv = ['MONTHS,RENTS', 'Mar 2026,3', 'Jan 2026,1', 'Dec 2025,0'].join('\n');
    expect(parseLedger(csv).rows.map((r) => r.month)).toEqual(['2025-12', '2026-01', '2026-03']);
  });

  it('throws naming the sheet row when a month cannot be parsed', () => {
    const csv = ['MONTHS,RENTS', 'Jan 2026,1', 'Smarch 2026,1'].join('\n');
    expect(() => parseLedger(csv)).toThrow('Row 3: cannot parse month "Smarch 2026"');
  });

  it('rejects month 13 instead of rolling it over', () => {
    expect(() => parseLedger('MONTHS,RENTS\n13/2026,1')).toThrow('Row 2: cannot parse month "13/2026"');
  });

  it('throws on an amount that is not a number', () => {
    expect(() => parseLedger('MONTHS,RENTS,TAXES\nJan 2026,1,abc')).toThrow('Row 2, TAXES: cannot parse amount "abc"');
  });

  it('throws when MONTHS or RENTS is missing from the header', () => {
    expect(() => parseLedger('MONTH,RENT\nJan 2026,1')).toThrow('Header must contain MONTHS and RENTS');
  });

  it('throws on a duplicated month', () => {
    expect(() => parseLedger('MONTHS,RENTS\nJan 2026,1\n2026-01,1')).toThrow('Row 3: month 2026-01 appears more than once');
  });
});
