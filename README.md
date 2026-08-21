# Personal Expense Tool

Restricted-access web app for logging work expenses paid with personal funds, receipt OCR, and reimbursement/payout tracking.

**Live:** https://mike554061.github.io/supplynow-expense-tracker/

## Access
- Restricted to authorized users; new users default password is set by the admin.
- Mike (owner/admin) can add users and is the only one who can **confirm** which expenses a deposit reimburses.

## What it does
- **Receipt upload + on-device OCR** (Tesseract.js) auto-fills date, vendor, amount, and guesses the cost center.
- **Append-only ledger** — every expenditure ever created stays and lives. Most current on top, oldest at the bottom. Rows are editable for OCR gaps / manual (no-receipt) entries. Paid checkbox on every row.
- **Keyed delete** — each row has a **DEL** button that removes only that row (safe even when IDs collide from a double-submit). It requires a confirmation key before it will delete, so accidental taps do nothing.
- **Metrics** — total personal spent, YTD, total reimbursed, total unpaid, open count, transfer fees YTD.
- **Personal Money Outstanding** — large running total owed back, broken out by cost center.
- **Deposits & Payroll** — anyone can log a deposit; Mike confirms allocation to expenses (updates paid/unpaid). Apple Cash deposits from Aaron ≥ $20,000 auto-flag as bi-weekly payroll (+$45 transfer fee). Transfer fees YTD baseline $1,869.23.
- **P&L / YTD** — expenses by GL cost center + prior-months paid-balance table.
- 18 GL cost centers. Statuses: Not Submitted · Submitted · Paid.
- ⬇ Backup exports the full ledger as JSON.

## Live cloud storage (shared across devices + Drive receipts)
The front-end is static, but it becomes **live, shared, and Drive-backed** when connected to the included Google Apps Script backend (`backend/Code.gs`):

1. https://script.google.com → New project → paste all of `backend/Code.gs` → Save.
2. Run `setup` once, approve permissions (creates a Drive folder + DB file, seeds the current expenses, and makes a **Receipt Inbox** folder).
3. Deploy → New deployment → Web app → *Execute as: Me*, *Who has access: Anyone* → copy the `/exec` URL.
4. In the app, open **⚙ Connect** (admin only), paste the URL, Save & Go Live.

Once connected: all expenses/deposits sync live across every device and user, receipt photos are saved to your Drive **Receipts** folder, and **🖼 Drive Match** lets you attach photos dropped into the Drive **Receipt Inbox** folder. Until connected, the app runs on-device (localStorage) with the same features.

## Run locally
```bash
python3 -m http.server 4231
# open http://localhost:4231
```
