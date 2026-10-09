# Property Ledger

A single-page dashboard of rent income and expenses for one rental property. It reads one Google Sheet tab as CSV. There is no backend.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm test         # parser and metrics tests
npm run build    # type check and production build into dist/
```

Without configuration the app loads `public/sample.csv`.

## Sheet format

One row per month. The header row must contain `MONTHS` and `RENTS`. Every other named column is an expense category, and its cell is the amount paid that month.

```csv
MONTHS,RENTS,TAXES,INSURANCE,MAINTENANCE,HOA,UTILITIES
Jan 2026,"$2,400.00",,"$1,380.00",$95.00,$285.00,$141.20
```

- Header names are matched case-insensitively. Extra spaces are ignored.
- You can add, remove, or rename expense columns. The dashboard picks them up.
- Amounts can be `1200`, `$1,200.50`, or `(300)` for a negative value such as a refund. A blank cell is 0.
- Months can be `Jan 2026`, `January 2026`, `2026-01`, `1/2026`, or `1/1/2026` (month first).
- Blank rows and a `TOTAL` row are skipped.
- A month that cannot be read, an amount that is not a number, or a month that appears twice stops the load. The error names the sheet row.

## Connect your Google Sheet

1. In Google Sheets, open **File > Share > Publish to web**.
2. Under **Link**, select the tab that holds the ledger. Select **Comma-separated values (.csv)**.
3. Click **Publish** and copy the link.
4. Create `.env.local` in the project root:

   ```sh
   VITE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/<id>/pub?gid=0&single=true&output=csv
   ```

5. Restart `npm run dev`. Vite reads the variable at startup and bakes it into `npm run build` output.

Anyone with a published link can read the sheet. Google can take a few minutes to serve edits through the published link. Click **Refresh** in the dashboard to fetch again.
