import { prisma } from "@/lib/prisma";
import PrintReport from "@/components/reports/PrintReport";

export const dynamic = "force-dynamic";

type SearchParams = { from?: string; to?: string; staff?: string };

function validDate(value?: string) { return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value); }

export default async function PrintReportPage({ searchParams }: { searchParams: SearchParams }) {
  const today = new Date().toISOString().slice(0, 10);
  const from = validDate(searchParams.from) ? searchParams.from! : `${today.slice(0, 7)}-01`;
  const to = validDate(searchParams.to) ? searchParams.to! : today;
  const staffId = searchParams.staff || "all";

  const [staff, leaves, expenses, payments, salaryHistory] = await Promise.all([
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
    prisma.leave.findMany({ include: { staff: true }, orderBy: { date: "asc" } }),
    prisma.staffExpense.findMany({ include: { staff: true }, orderBy: { date: "asc" } }),
    prisma.salaryPayment.findMany({ include: { staff: true }, orderBy: { paidAt: "desc" } }),
    prisma.salaryHistory.findMany({ orderBy: [{ month: "desc" }, { staffId: "asc" }] }),
  ]);

  const safe = JSON.parse(JSON.stringify({ staff, leaves, expenses, payments, salaryHistory }));
  return <PrintReport from={from} to={to} staffId={staffId} data={safe} />;
}
