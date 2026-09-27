# Personal Finance Dashboard — Architecture & UI Brainstorm

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Vite + TypeScript + Tailwind + Recharts + TanStack)   │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP / REST
┌──────────────────────────▼──────────────────────────────┐
│               FastAPI (Python Backend)                   │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  Properties  │  │  Investments   │  │  Cash Flow  │ │
│  │   Service    │  │    Service     │  │   Service   │ │
│  └──────┬───────┘  └───────┬────────┘  └──────┬──────┘ │
│         └──────────────────┼───────────────────┘        │
│                    ┌───────▼────────┐                    │
│                    │  SQLAlchemy    │                    │
│                    │     ORM        │                    │
│                    └───────┬────────┘                    │
│         ┌──────────────────┼───────────────────┐        │
│  ┌──────▼───────┐  ┌───────▼───────┐  ┌───────▼──────┐ │
│  │  yfinance    │  │  PostgreSQL   │  │  APScheduler │ │
│  │ (stock data) │  │   Database    │  │ (price sync) │ │
│  └──────────────┘  └───────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🐍 Backend — Python (FastAPI)

### Tech Stack
| Layer | Choice | Why |
|---|---|---|
| Framework | FastAPI | Async, auto-docs, Pydantic validation |
| ORM | SQLAlchemy + Alembic | Clean models, migrations |
| Database | PostgreSQL | ACID, relational (you already like it) |
| Stock Data | `yfinance` | Free, no API key needed |
| Scheduling | APScheduler | Auto-refresh stock prices daily |
| Env Config | `python-dotenv` | Keep credentials out of code |

---

### API Routes

```
/api/
├── properties/
│   ├── GET    /                → all properties + summary
│   ├── POST   /                → add property
│   ├── GET    /{id}            → single property detail
│   ├── PUT    /{id}            → update property
│   ├── GET    /{id}/cashflow   → P&L for property
│   └── GET    /{id}/expenses   → all expenses for property
│
├── expenses/
│   ├── GET    /                → all recurring charges
│   ├── POST   /                → create expense
│   ├── PUT    /{id}            → update
│   └── DELETE /{id}            → remove
│
├── investments/
│   ├── GET    /accounts        → brokerage accounts + totals
│   ├── GET    /holdings        → all holdings with live price
│   ├── POST   /holdings        → add holding
│   ├── POST   /transactions    → log buy/sell/dividend
│   └── GET    /performance     → gain/loss over time
│
└── portfolio/
    ├── GET    /summary         → top-level net worth snapshot
    ├── GET    /cashflow        → monthly income/expense breakdown
    └── GET    /allocation      → asset class pie chart data
```

---

### Database Schema (Key Tables)

```python
# properties
class Property(Base):
    id, address, city, state, zip_code
    purchase_price, purchase_date
    current_value          # manually updated or from Zillow
    property_type          # SFR, multi, commercial
    status                 # renting, vacant, personal

# mortgages
class Mortgage(Base):
    id, property_id
    balance, rate, monthly_payment
    start_date, term_years, lender

# rental_income
class RentalIncome(Base):
    id, property_id
    monthly_rent, tenant_name
    lease_start, lease_end, is_active
    # + PaymentLog child table

# expenses  (covers all recurring charges)
class Expense(Base):
    id, property_id        # nullable = investment/personal expense
    name, amount
    category               # tax | insurance | HOA | maintenance | util
    frequency              # monthly | quarterly | annually | one-time
    next_due_date
    is_active

# investment_accounts
class InvestmentAccount(Base):
    id, name               # "Fidelity Roth IRA", "Robinhood"
    account_type           # brokerage | IRA | 401k | crypto

# holdings
class Holding(Base):
    id, account_id
    ticker, name
    shares, cost_basis_per_share
    current_price          # updated by APScheduler daily
    asset_class            # stock | ETF | bond | REIT | crypto

# transactions
class Transaction(Base):
    id, holding_id
    type                   # buy | sell | dividend | split
    date, shares, price_per_share, total_amount
```

---

## ⚛️ Frontend — React

### Tech Stack
| Purpose | Library |
|---|---|
| Build | Vite + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State/Fetching | TanStack Query (React Query) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod |
| Icons | Lucide React |
| Tables | TanStack Table |
| Date handling | date-fns |

---

### Page Structure

```
/dashboard          → Overview / Net Worth
/real-estate        → All properties
/real-estate/:id    → Single property detail
/investments        → Holdings + accounts
/cashflow           → Monthly P&L breakdown
/expenses           → All recurring charges
/settings           → Manual data entry / sync
```

---

## 🎨 UI Design

### Visual Vibe
- **Dark theme** — deep navy/slate background (`#0F1117` / `#1A1D2E`)
- Green for positive cash flow / gains (`#22C55E`)
- Red for negative / losses (`#EF4444`)
- Amber for warnings like upcoming charges (`#F59E0B`)
- Clean card-based layout, data-dense but breathable

---

### Page 1 — Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  💰 Angel's Portfolio             Sept 26, 2026             │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  NET WORTH   │ MONTHLY CF   │  RE EQUITY   │  INVEST VALUE │
│  $1.2M       │  +$3,400     │  $340K       │  $580K        │
│  ↑ 2.1% MoM  │  gross $5.2K │  Revere MA   │  ↑ 4.3% YTD  │
├──────────────┴──────────────┴──────────────┴───────────────┤
│  NET WORTH OVER TIME (12 months)        ASSET ALLOCATION   │
│  ┌────────────────────────────┐         ┌────────────────┐ │
│  │  📈 Line chart (Recharts)  │         │  🥧 Pie chart  │ │
│  │  Real Estate vs Invest     │         │  RE / Stock /  │ │
│  │  stacked area              │         │  Bond / Cash   │ │
│  └────────────────────────────┘         └────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  UPCOMING EXPENSES THIS MONTH                               │
│  🏠 Property Tax — Revere    $1,200    Due Oct 1  ⚠️       │
│  🏠 Insurance — Revere         $180    Due Oct 15          │
│  📈 Fidelity Advisory Fee       $45    Due Oct 30          │
└─────────────────────────────────────────────────────────────┘
```

---

### Page 2 — Real Estate Portfolio

```
┌─────────────────────────────────────────────────────────────┐
│  Real Estate Portfolio            [+ Add Property]          │
│  2 Properties · Total Value $880K · Monthly CF +$2,800      │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────┐ ┌──────────────────────┐ │
│  │ 🏠 123 Ocean Ave, Revere MA   │ │ + Add New Property   │ │
│  │ ─────────────────────────── │ │                      │ │
│  │ Value:     $440K              │ └──────────────────────┘ │
│  │ Equity:    $340K  (77%)       │                          │
│  │ Mortgage:  $100K @ 3.x%       │                          │
│  │ Gross Rent: $2,500/mo         │                          │
│  │ Net CF:    +$800/mo  ✅       │                          │
│  │ Cap Rate:   4.6%              │                          │
│  │ Cash/Cash:  2.4%              │                          │
│  │            [View Details →]   │                          │
│  └───────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Page 3 — Property Detail

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back   123 Ocean Ave, Revere MA          [Edit] [Delete] │
├──────────┬──────────┬──────────┬────────────┬──────────────┤
│  VALUE   │  EQUITY  │ GROSS/MO │  NET/MO    │  CAP RATE    │
│  $440K   │  $340K   │  $2,500  │  +$800     │  4.6%        │
├──────────┴──────────┴──────────┴────────────┴──────────────┤
│  [Overview] [Income] [Expenses] [Mortgage] [History]        │
├─────────────────────────────────────────────────────────────┤
│  MONTHLY P&L                                                │
│  Gross Rent             +$2,500                             │
│  ────────────────────────────────                           │
│  Mortgage P&I            -$800                              │
│  Property Tax            -$400  (annual $4,800 / 12)        │
│  Insurance               -$180                              │
│  HOA                       -$0                              │
│  Maintenance reserve     -$200                              │
│  Vacancy reserve         -$120  (5%)                        │
│  ────────────────────────────────                           │
│  NET CASH FLOW          +$800   ✅                          │
├─────────────────────────────────────────────────────────────┤
│  CASH FLOW HISTORY (Bar Chart — last 12 months)             │
│  ████ ████ ████ ████ ████ ████ ████ ████ ████ ████ ████    │
└─────────────────────────────────────────────────────────────┘
```

---

### Page 4 — Investments

```
┌─────────────────────────────────────────────────────────────┐
│  Investments                         Total Value: $580,000  │
│  [Fidelity Roth ▼]  [All Accounts]          YTD: +$24,140  │
├─────────────────────────────────────────────────────────────┤
│  Ticker  │ Shares │ Avg Cost │ Curr Price │ Value   │ G/L   │
│  ────────┼────────┼──────────┼────────────┼─────────┼────── │
│  VTI     │  120   │  $210    │  $235      │ $28,200 │ +11.9%│
│  SCHD    │   85   │  $78     │  $82       │  $6,970 │  +5.1%│
│  BTC     │  0.45  │  $60K    │  $95K      │ $42,750 │ +58.3%│
│  ...     │        │          │            │         │       │
├─────────────────────────────────────────────────────────────┤
│  ALLOCATION                  │  DIVIDENDS (last 12 mo)      │
│  🥧 Pie: Stock/Bond/ETF/Crypto│  📊 Bar chart by month      │
│                              │  Total: $3,240/year          │
└─────────────────────────────────────────────────────────────┘
```

---

### Page 5 — Cash Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Cash Flow — September 2026          [◀ Aug] [Oct ▶]        │
├──────────────────────┬──────────────────────────────────────┤
│  INCOME              │  EXPENSES                            │
│  Rent (Revere)$2,500 │  Mortgages         $800             │
│  Dividends     $270  │  Property Taxes    $400             │
│  ─────────────────── │  Insurance         $180             │
│  Gross:      $2,770  │  Maintenance       $200             │
│                      │  Vacancy Reserve   $120             │
│                      │  ──────────────────────             │
│                      │  Total Out:      $1,700             │
├──────────────────────┴──────────────────────────────────────┤
│  NET CASH FLOW: +$1,070                                     │
├─────────────────────────────────────────────────────────────┤
│  12-MONTH TREND (Stacked Bar: Income vs Expenses vs Net)    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  📊 Recharts BarChart grouped by month                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project File Structure

```
portfolio-dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── database.py          # DB connection
│   │   ├── models/              # SQLAlchemy models
│   │   │   ├── property.py
│   │   │   ├── investment.py
│   │   │   └── expense.py
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── routers/             # Route handlers
│   │   │   ├── properties.py
│   │   │   ├── investments.py
│   │   │   ├── expenses.py
│   │   │   └── portfolio.py
│   │   ├── services/            # Business logic
│   │   │   ├── cashflow.py      # Net/gross calculations
│   │   │   ├── price_sync.py    # yfinance scheduler
│   │   │   └── aggregation.py  # Net worth rollups
│   │   └── scheduler.py        # APScheduler setup
│   ├── alembic/                 # Migrations
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── RealEstate.tsx
    │   │   ├── PropertyDetail.tsx
    │   │   ├── Investments.tsx
    │   │   └── CashFlow.tsx
    │   ├── components/
    │   │   ├── KPICard.tsx
    │   │   ├── PropertyCard.tsx
    │   │   ├── HoldingsTable.tsx
    │   │   ├── CashFlowChart.tsx
    │   │   └── AllocationPie.tsx
    │   ├── hooks/
    │   │   └── usePortfolio.ts   # TanStack Query hooks
    │   └── lib/
    │       └── api.ts            # Axios client
    └── package.json
```

---

## 💡 Key Design Decisions

| Decision | Recommendation | Reason |
|---|---|---|
| Auth | None or single API key env var | Personal use only, no need for full auth |
| Stock prices | `yfinance` + daily cron | Free, no API limits for personal use |
| Property values | Manual entry | Most reliable — you know your own numbers |
| Data entry | Forms in Settings page | Simple for personal use |
| Deployment | Docker Compose locally | Spin up Postgres + FastAPI + React together |
| Backup | pg_dump cron to local file | Protect your financial data |

---

## 🚀 Where to Start (Build Order)

1. **Postgres schema + FastAPI CRUD for properties and expenses**
2. **Cash flow calculation service** (gross/net per property)
3. **Dashboard summary endpoint** (aggregate across all assets)
4. **React shell** — sidebar, routing, KPI cards pulling from API
5. **Recharts integration** — cash flow bar, net worth line, allocation pie
6. **Investments module** — holdings table + yfinance price sync
7. **Expense calendar** — upcoming charges view
