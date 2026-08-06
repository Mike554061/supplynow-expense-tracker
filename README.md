# SupplyNow · Expense & Payout Ledger

A restricted-access web app for logging work expenses paid with personal funds, receipt OCR, and reimbursement/payout tracking.

**Live:** https://mike554061.github.io/supplynow-expense-tracker/

## Access
- Authorized: `mike@supplynow.org`, `aaron@supplynow.org`
- New-user default password: `Supplynow1!`
- Mike (owner/admin) can add users and is the only one who can **confirm** which expenses a deposit reimburses.

## What it does
- **Receipt upload + on-device OCR** (Tesseract.js) auto-fills date, vendor, amount, and guesses the cost center. No API key, nothing leaves the browser.
- **Ledger** — every expense visible, newest on top / oldest at bottom, receipt photo always attached, editable rows for OCR gaps or manual (no-receipt) entries. Paid checkbox on every row.
- **Metrics** — total personal spent, YTD, reimbursed, unpaid, partially reimbursed, open count, avg reimbursement time, avg days unpaid, transfer fees YTD.
- **Personal Money Outstanding** — running total owed back, broken out by cost center.
- **Deposits & Payroll** — anyone can log a deposit; Mike confirms allocation to expenses (updates paid/unpaid). Apple Cash deposits from Aaron ≥ $20,000 auto-flag as bi-weekly payroll (+$45 transfer fee). Transfer fees YTD baseline $1,869.23.
- **P&L / YTD** — expenses grouped by GL cost center + prior-months paid-balance table.
- 18 GL cost centers (Fuel, Repairs & Maintenance, Vehicle Parts, etc.).
- Statuses: Not Submitted · Submitted · Partial · Paid.
- ⬇ Backup exports the full ledger as JSON.

Seeded with the 15 current unpaid expenses (R001–R015) and YTD balances from the source sheet.

## Data & hosting note
This is a static, GitHub Pages build. Data persists **per-device** in the browser (localStorage), and receipts are stored with each expense. Three spec items need a live backend to be fully realized and are the planned v2:
1. **Shared multi-device storage** (so Mike and Aaron see the same ledger without exchanging the backup file).
2. **Saving receipts into a Google Drive folder.**
3. **Auto-matching existing Drive receipt photos** to expenses.

The data layer is structured so a Google Apps Script backend can be bolted on to cover all three. Until then, use ⬇ Backup to move data between devices.

## Run locally
```bash
python3 -m http.server 4231
# open http://localhost:4231
```
