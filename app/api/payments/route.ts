import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function validMonth(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const staffId = Number(body.staffId);
    const month = String(body.month || "");
    const baseSalary = Number(body.baseSalary);
    const leaveDays = Number(body.leaveDays);
    const deduction = Number(body.deduction);
    const paidAmount = Number(body.paidAmount);
    if (!staffId || !validMonth(month) || ![baseSalary, leaveDays, deduction, paidAmount].every(Number.isFinite) || [baseSalary, leaveDays, deduction, paidAmount].some(v => v < 0)) {
      return NextResponse.json({ error: "Invalid salary payment data." }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { joiningDate: true } });
    if (!staff) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    if (staff.joiningDate && month < staff.joiningDate.toISOString().slice(0, 7)) {
      return NextResponse.json({ error: "A salary payment cannot be recorded before the joining month." }, { status: 400 });
    }

    const payment = await prisma.salaryPayment.upsert({
      where: { staffId_month: { staffId, month } },
      update: { baseSalary, leaveDays, deduction, paidAmount, notes: body.notes || null, paidAt: new Date() },
      create: { staffId, month, baseSalary, leaveDays, deduction, paidAmount, notes: body.notes || null },
      include: { staff: true }
    });
    return NextResponse.json(payment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save salary payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.salaryPayment.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
