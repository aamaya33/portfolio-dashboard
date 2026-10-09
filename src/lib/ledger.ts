import Papa from 'papaparse';

export type MonthRow = {
  month: string; // YYYY-MM
  rent: number;
  expenses: Record<string, number>;
};

export type Ledger = {
  categories: string[];
  rows: MonthRow[];
};

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function toMonth(year: string, month: number): string | null {
  if (month < 1 || month > 12) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonth(raw: string): string | null {
  const s = raw.trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/))) return toMonth(m[1]!, Number(m[2]));
  if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return toMonth(m[2]!, Number(m[1]));
  // US order (M/D/YYYY): that is how Google Sheets exports dates in en-US locales.
  if ((m = s.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/))) return toMonth(m[2]!, Number(m[1]));
  if ((m = s.match(/^([a-z]{3,})\.?[\s-]+(\d{4})$/i))) {
    const word = m[1]!.toLowerCase();
    const index = MONTH_NAMES.findIndex((name) => name.startsWith(word));
    return index === -1 ? null : toMonth(m[2]!, index + 1);
  }
  return null;
}

function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (s === '') return 0;
  let sign = 1;
  if (s.startsWith('(') && s.endsWith(')')) {
    sign = -1;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, '');
  if (s === '' || s === '-') return 0;
  const n = Number(s);
  return Number.isFinite(n) ? sign * n : null;
}

export function parseLedger(csvText: string): Ledger {
  const { data } = Papa.parse<string[]>(csvText.trim(), { skipEmptyLines: false });
  const [header, ...body] = data;
  if (!header) throw new Error('Sheet is empty: expected a header row with MONTHS and RENTS.');

  const names = header.map((h) => h.trim());
  const monthCol = names.findIndex((h) => h.toLowerCase() === 'months');
  const rentCol = names.findIndex((h) => h.toLowerCase() === 'rents');
  if (monthCol === -1 || rentCol === -1) {
    throw new Error(`Header must contain MONTHS and RENTS columns, got: ${names.join(', ')}`);
  }
  // Sheets often export trailing empty columns; a column with no header name is not a category.
  const expenseCols = names
    .map((name, col) => ({ name, col }))
    .filter(({ name, col }) => name !== '' && col !== monthCol && col !== rentCol);
  const categories = [...new Set(expenseCols.map((c) => c.name))];

  const rows: MonthRow[] = [];
  const seen = new Set<string>();
  body.forEach((cells, i) => {
    const sheetRow = i + 2;
    if (cells.every((c) => c.trim() === '')) return;
    const rawMonth = cells[monthCol] ?? '';
    if (/^total/i.test(rawMonth.trim())) return;

    const month = parseMonth(rawMonth);
    if (!month) throw new Error(`Row ${sheetRow}: cannot parse month "${rawMonth}". Use e.g. "Jan 2026" or "2026-01".`);
    if (seen.has(month)) throw new Error(`Row ${sheetRow}: month ${month} appears more than once.`);
    seen.add(month);

    const amount = (col: number, label: string) => {
      const raw = cells[col] ?? '';
      const n = parseAmount(raw);
      if (n === null) throw new Error(`Row ${sheetRow}, ${label}: cannot parse amount "${raw}".`);
      return n;
    };

    const expenses: Record<string, number> = Object.fromEntries(categories.map((c) => [c, 0]));
    for (const { name, col } of expenseCols) expenses[name]! += amount(col, name);
    rows.push({ month, rent: amount(rentCol, names[rentCol]!), expenses });
  });

  rows.sort((a, b) => a.month.localeCompare(b.month));
  return { categories, rows };
}
