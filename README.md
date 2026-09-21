# Staff Salary & Expense Manager

Simple no-auth Next.js app for managing staff, salary, leaves and staff expenses / advances.

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Prisma 6
- Neon PostgreSQL
- Vercel compatible

## 1. Install

```bash
npm install
```

## 2. Add Neon connection

Create `.env.local`:

```env
DATABASE_URL="YOUR_NEON_CONNECTION_STRING"
```

Do not commit `.env.local`.

## 3. Create database tables

```bash
npx prisma db push
```

Then:

```bash
npm run dev
```

Open http://localhost:3000

## 4. Vercel

Add `DATABASE_URL` in Vercel Project Settings -> Environment Variables.

Build command:

```bash
npm run build
```

The build automatically runs `prisma generate`.

## Features

- No authentication
- Add/edit/delete staff
- Monthly salary
- Joining date
- Active/inactive staff
- Exact leave dates
- Half-day / 1-day / multiple-day leave
- Automatic 30-day salary deduction calculation
- Mark salary paid for each month
- Staff expense and advance tracking
- Monthly filtering
- Responsive mobile UI

## Salary & Salary History

- `Staff.salary` stores the current monthly salary.
- `SalaryHistory` stores the salary rate effective from a month.
- When adding a staff member, the joining month is automatically recorded as the initial salary.
- For older staff, add the salary for the joining month in **Salary History**, then add another record only when the salary changes.
- Months without a new salary-history record carry forward the latest previous salary.
- A report never uses the current salary for an older month once salary history exists; if an older month's history is missing, that month is shown as missing instead of silently using today's salary.

## Salary calculation

For a complete calendar month:

`Salary earned = Monthly Salary`

For a partial joining/report month:

`Salary earned = Monthly Salary / 30 × Eligible Days`

Leave deduction uses the same 30-day basis:

`Leave deduction = Monthly Salary / 30 × Leave Days`

`Final Payable = Salary Earned - Leave Deduction - Staff Expenses`

The report starts salary calculation from the employee's joining date, even if the selected report starts earlier.

## Leave calculation

When adding leave, enter Leave Date and Rejoin Date. The rejoin date is not counted as leave. Leave that starts before an employee's joining date is rejected, and report calculations ignore any legacy leave before joining.

## Staff expense logic

Expenses belong to a specific staff member and are deducted from that staff member's payable salary. Expenses dated before the staff member's joining date are rejected.

## Salary payments

Salary payments are stored once per staff member per month. Payments before the joining month are rejected. The payment screen uses the historical salary rate and the correct earned amount for a partial joining month.

## Reports

Reports support a custom date range and staff filter. They calculate salary month-by-month using Salary History, start from the joining date, prorate partial months on a 30-day basis, apply leave deductions and staff expenses, then subtract recorded salary payments. The A4 report shows the monthly salary rate, salary earned, leave days, leave deduction, and warnings when historical salary records are missing.

## Recent updates

- Added **Bulk Add Expenses**: choose one staff member and date, enter multiple separate expense rows, and save them all in one action. Each row remains a separate `StaffExpense` record for reporting and individual deletion.
- Added **Delete Paid** on the Salary screen so an incorrectly marked salary payment can be removed and the month returns to Pending.
- Expense bulk creation validates staff joining dates and uses a Prisma transaction so the batch is saved atomically.
