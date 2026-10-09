import { useCallback, useEffect, useState } from 'react';
import { Bar, CartesianGrid, Cell as Slice, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { parseLedger, type Ledger, type MonthRow } from './lib/ledger';
import { categoryTotals, monthExpenses, selectRange, summarize, type Range } from './lib/metrics';

const SHEET_URL: string | undefined = import.meta.env.VITE_SHEET_CSV_URL;
const SOURCE_URL = SHEET_URL || '/sample.csv';

// Categorical dark palette validated for CVD and contrast against the panel surface.
// ponytail: past 8 categories colors repeat; fold the smallest into "Other" if a sheet ever gets there.
const PALETTE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const RENT_COLOR = '#F5F6FA';

const RANGES: { value: Range; label: string }[] = [
  { value: 6, label: 'Last 6' },
  { value: 12, label: '12 months' },
  { value: 'all', label: 'All' },
];

type Load =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; ledger: Ledger; loadedAt: Date };

async function fetchLedger(): Promise<Ledger> {
  const res = await fetch(SOURCE_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Could not load ${SOURCE_URL} (HTTP ${res.status}).`);
  if (res.headers.get('content-type')?.includes('text/html')) {
    throw new Error('The sheet URL returned a web page, not CSV. Publish the sheet to the web as CSV and use that link.');
  }
  return parseLedger(await res.text());
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const usdCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' });
const signed = (n: number) => (n > 0 ? '+' : '') + usd.format(n);

function monthLabel(month: string, year: 'numeric' | '2-digit' = 'numeric'): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y!, m! - 1).toLocaleString('en-US', { month: 'short', year });
}

export default function App() {
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [range, setRange] = useState<Range>(12);

  const refresh = useCallback(() => {
    setLoad({ status: 'loading' });
    fetchLedger().then(
      (ledger) => setLoad({ status: 'ready', ledger, loadedAt: new Date() }),
      (e: unknown) => setLoad({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
    );
  }, []);

  useEffect(refresh, [refresh]);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">P</div>
          <div>
            <div className="brand-name">Property Ledger</div>
            <div className="brand-sub">Income and expenses</div>
          </div>
        </div>
        <div className="sidebar-footer">
          <div className="source-label">Source</div>
          <div className="source-value">{SHEET_URL ? 'Google Sheet' : 'Sample data'}</div>
          {load.status === 'ready' && (
            <div className="source-time">Loaded {load.loadedAt.toLocaleTimeString()}</div>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">Cash flow</h1>
            <div className="page-sub">
              {load.status === 'ready' ? rangeCaption(selectRange(load.ledger.rows, range)) : ' '}
            </div>
          </div>
          <div className="topbar-right">
            <div className="segmented" role="group" aria-label="Date range">
              {RANGES.map((r) => (
                <button key={r.label} aria-pressed={range === r.value} onClick={() => setRange(r.value)}>
                  {r.label}
                </button>
              ))}
            </div>
            <button className="pill-btn primary" onClick={refresh} disabled={load.status === 'loading'}>
              {load.status === 'loading' ? 'Loading…' : 'Refresh'}
            </button>
          </div>
        </header>

        {load.status === 'loading' && <div className="state">Loading ledger…</div>}
        {load.status === 'error' && (
          <div className="state error" role="alert">
            <div className="state-title">Could not load the ledger</div>
            <div>{load.message}</div>
          </div>
        )}
        {load.status === 'ready' && <Dashboard ledger={load.ledger} rows={selectRange(load.ledger.rows, range)} />}
      </main>
    </div>
  );
}

function rangeCaption(rows: MonthRow[]): string {
  if (rows.length === 0) return 'No months in the sheet';
  return `${monthLabel(rows[0]!.month)} to ${monthLabel(rows[rows.length - 1]!.month)} · ${rows.length} months`;
}

function Dashboard({ ledger, rows }: { ledger: Ledger; rows: MonthRow[] }) {
  const { categories } = ledger;
  const color = (c: string) => PALETTE[categories.indexOf(c) % PALETTE.length];
  const summary = summarize(rows);
  const byCategory = categoryTotals(rows, categories);
  const ranked = [...categories].sort((a, b) => byCategory[b]! - byCategory[a]!);

  return (
    <>
      <section className="kpi-row">
        <Kpi label="Total rent" value={usd.format(summary.rent)} />
        <Kpi label="Total expenses" value={usd.format(summary.expenses)} />
        <Kpi label="Net cash flow" value={signed(summary.net)} tone={summary.net} />
        <Kpi label="Avg monthly net" value={signed(summary.avgNet)} tone={summary.avgNet} />
      </section>

      <section className="mid-row">
        <div className="panel">
          <div className="panel-title">Expenses by month</div>
          <div className="panel-title-sub">Stacked by category, rent as a line</div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={rows} stackOffset="sign" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#2A2E45" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(m: string) => monthLabel(m, '2-digit')} tick={{ fill: '#6E7492', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(n: number) => usdCompact.format(n)} tick={{ fill: '#6E7492', fontSize: 11 }} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ fill: '#ffffff0a' }}
                  contentStyle={{ background: '#1A1D2E', border: '1px solid #2A2E45', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#F5F6FA', fontWeight: 600 }}
                  itemStyle={{ color: '#A6ACC4' }}
                  labelFormatter={(m: string) => monthLabel(m)}
                  formatter={(n: number) => usd.format(n)}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11.5 }}
                  iconType="square"
                  iconSize={8}
                  formatter={(name: string) => <span style={{ color: '#A6ACC4' }}>{name}</span>}
                />
                {categories.map((c) => (
                  <Bar key={c} dataKey={(r: MonthRow) => r.expenses[c]} name={c} stackId="expenses" fill={color(c)} stroke="#1B1E2E" strokeWidth={1} maxBarSize={36} isAnimationActive={false} />
                ))}
                <Line dataKey="rent" name="Rent" stroke={RENT_COLOR} strokeWidth={2} dot={{ r: 3, fill: RENT_COLOR }} type="linear" isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Expense share</div>
          <div className="panel-title-sub">By category, selected range</div>
          <div className="pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={ranked.map((c) => ({ name: c, value: byCategory[c]! }))} dataKey="value" nameKey="name" outerRadius="90%" label={({ cx, cy, midAngle, outerRadius, percent }) => {
                  if (percent < 0.04) return null;
                  const a = (-midAngle * Math.PI) / 180;
                  return <text x={cx + 0.6 * outerRadius * Math.cos(a)} y={cy + 0.6 * outerRadius * Math.sin(a)} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={12} fontWeight={600}>{`${Math.round(percent * 100)}%`}</text>;
                }} labelLine={false} stroke="#1B1E2E" strokeWidth={2} isAnimationActive={false}>
                  {ranked.map((c) => <Slice key={c} fill={color(c)} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1A1D2E', border: '1px solid #2A2E45', borderRadius: 10, fontSize: 12 }}
                  itemStyle={{ color: '#A6ACC4' }}
                  formatter={(n: number) => usd.format(n)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="share-list">
            {ranked.map((c) => (
              <li key={c}>
                <div className="share-head">
                  <span className="share-label"><span className="dot" style={{ background: color(c) }} />{c}</span>
                  <span>
                    <span className="mono share-value">{usd.format(byCategory[c]!)}</span>
                    <span className="share-pct">
                      {summary.expenses ? `${Math.round((byCategory[c]! / summary.expenses) * 100)}%` : '–'}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title">Expense table</div>
        <div className="panel-title-sub">Month by category</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                {categories.map((c) => <th key={c}>{c}</th>)}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month}>
                  <td>{monthLabel(r.month)}</td>
                  {categories.map((c) => <Cell key={c} value={r.expenses[c]!} />)}
                  <Cell value={monthExpenses(r)} />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                {categories.map((c) => <Cell key={c} value={byCategory[c]!} />)}
                <Cell value={summary.expenses} />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: number }) {
  const cls = tone === undefined || tone === 0 ? '' : tone > 0 ? 'pos' : 'neg';
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${cls}`}>{value}</div>
    </div>
  );
}

function Cell({ value }: { value: number }) {
  return <td className={`mono num ${value === 0 ? 'zero' : ''}`}>{value === 0 ? '–' : usd.format(value)}</td>;
}
