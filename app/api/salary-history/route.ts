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
    const salary = Number(body.salary);
    if (!staffId || !validMonth(month) || !Number.isFinite(salary) || salary < 0) {
      return NextResponse.json({ error: "Staff, valid month and salary are required." }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { joiningDate: true } });
    if (!staff) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    if (staff.joiningDate) {
      const joiningMonth = staff.joiningDate.toISOString().slice(0, 7);
      if (month < joiningMonth) {
        return NextResponse.json({ error: `Salary history cannot be before the joining month (${joiningMonth}).` }, { status: 400 });
      }
    }

    const history = await prisma.salaryHistory.upsert({
      where: { staffId_month: { staffId, month } },
      update: { salary, notes: body.notes ? String(body.notes).trim() : null },
      create: { staffId, month, salary, notes: body.notes ? String(body.notes).trim() : null },
      include: { staff: true }
    });
    return NextResponse.json(history);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save salary history.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    await prisma.salaryHistory.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete salary history.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
