import { prisma } from "@/lib/prisma";
import ReportsCenter from "@/components/reports/ReportsCenter";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [staff, leaves, expenses, payments, salaryHistory] = await Promise.all([
    prisma.staff.findMany({ orderBy: { name: "asc" } }),
    prisma.leave.findMany({ include: { staff: true }, orderBy: { date: "asc" } }),
    prisma.staffExpense.findMany({ include: { staff: true }, orderBy: { date: "asc" } }),
    prisma.salaryPayment.findMany({ include: { staff: true }, orderBy: { paidAt: "desc" } }),
    prisma.salaryHistory.findMany({ orderBy: [{ month: "desc" }, { staffId: "asc" }] }),
  ]);

  const safe = JSON.parse(JSON.stringify({ staff, leaves, expenses, payments, salaryHistory }));
  return <ReportsCenter initialData={safe} />;
}
