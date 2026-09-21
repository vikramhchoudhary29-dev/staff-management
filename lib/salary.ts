export type SalaryHistoryItem = {
  id: number;
  staffId: number;
  month: string;
  salary: number;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function monthKey(value: string | Date) {
  const d = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthStart(month: string) {
  return `${month.slice(0, 7)}-01`;
}

export function monthEnd(month: string) {
  const [year, monthNumber] = month.slice(0, 7).split("-").map(Number);
  const d = new Date(Date.UTC(year, monthNumber, 0));
  return d.toISOString().slice(0, 10);
}

export function monthsBetween(from: string, to: string) {
  const result: string[] = [];
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return result;
  while (start <= end) {
    result.push(`${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`);
    start.setUTCMonth(start.getUTCMonth() + 1);
  }
  return result;
}

export function salaryForMonth(
  history: SalaryHistoryItem[],
  staffId: number,
  month: string,
  fallbackSalary: number
) {
  const target = month.slice(0, 7);
  const staffHistory = history
    .filter(h => h.staffId === staffId)
    .sort((a, b) => b.month.localeCompare(a.month));
  const applicable = staffHistory.find(h => h.month.slice(0, 7) <= target);
  // If this staff member has no history at all (legacy record), use Staff.salary as a safe fallback.
  // Once history exists, a month before the first historical record is intentionally treated as 0
  // so the report never silently uses today's salary for an older period.
  return applicable?.salary ?? (staffHistory.length === 0 ? fallbackSalary : 0);
}

export function daysInclusive(start: string, end: string) {
  const a = new Date(`${start.slice(0, 10)}T00:00:00Z`).getTime();
  const b = new Date(`${end.slice(0, 10)}T00:00:00Z`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

export function getMonthEmploymentPeriod(month: string, from: string, to: string, joiningDate?: string | null) {
  const mStart = monthStart(month);
  const mEnd = monthEnd(month);
  const starts = [from, mStart];
  if (joiningDate) starts.push(joiningDate.slice(0, 10));
  const start = starts.sort().slice(-1)[0];
  const end = [to, mEnd].sort()[0];
  if (!start || start > end) return null;
  return { start, end, monthStart: mStart, monthEnd: mEnd };
}

export function earnedSalaryForPeriod(monthlySalary: number, period: { start: string; end: string; monthStart: string; monthEnd: string }) {
  // A complete calendar month always receives the full monthly salary, including February.
  if (period.start === period.monthStart && period.end === period.monthEnd) return monthlySalary;
  // Partial months use the same 30-day basis as leave deductions.
  return monthlySalary * Math.min(30, daysInclusive(period.start, period.end)) / 30;
}

export function isMonthBeforeJoining(joiningDate: string | null | undefined, month: string) {
  if (!joiningDate) return false;
  return month.slice(0, 7) < joiningDate.slice(0, 7);
}
