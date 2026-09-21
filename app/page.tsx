import { prisma } from "@/lib/prisma";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [staff, expenses, leaves, payments, salaryHistory] = await Promise.all([
    prisma.staff.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.staffExpense.findMany({ include: { staff: true }, orderBy: { date: "desc" }, take: 100 }),
    prisma.leave.findMany({ include: { staff: true }, orderBy: { date: "desc" }, take: 200 }),
    prisma.salaryPayment.findMany({ include: { staff: true }, orderBy: { paidAt: "desc" }, take: 100 }),
    prisma.salaryHistory.findMany({ orderBy: [{ month: "desc" }, { staffId: "asc" }] })
  ]);

  const safe = JSON.parse(JSON.stringify({ staff, expenses, leaves, payments, salaryHistory }));
  return <Dashboard initialData={safe} />;
}