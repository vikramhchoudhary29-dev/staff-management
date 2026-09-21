import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calculateLeaveDays(leaveDate: string, rejoinDate: string) {
  const start = new Date(`${leaveDate}T00:00:00Z`);
  const end = new Date(`${rejoinDate}T00:00:00Z`);
  const diff = Math.round((end.getTime() - start.getTime()) / 86400000);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(leaveDate) || !/^\d{4}-\d{2}-\d{2}$/.test(rejoinDate) || Number.isNaN(diff) || diff < 1) {
    throw new Error("Rejoin date must be after the leave date.");
  }
  return diff;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const staffId = Number(body.staffId);
    const leaveDate = String(body.date || "");
    const rejoinDate = String(body.rejoinDate || "");
    const days = calculateLeaveDays(leaveDate, rejoinDate);
    if (!staffId) throw new Error("Please select a staff member.");

    const staff = await prisma.staff.findUnique({ where: { id: staffId }, select: { joiningDate: true } });
    if (!staff) throw new Error("Staff member not found.");
    if (staff.joiningDate && leaveDate < staff.joiningDate.toISOString().slice(0, 10)) {
      throw new Error(`Leave cannot start before the joining date (${staff.joiningDate.toISOString().slice(0, 10)}).`);
    }

    const leave = await prisma.leave.create({
      data: {
        staffId,
        date: new Date(`${leaveDate}T00:00:00Z`),
        rejoinDate: new Date(`${rejoinDate}T00:00:00Z`),
        days,
        reason: body.reason || null
      },
      include: { staff: true }
    });

    return NextResponse.json(leave);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add leave.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.leave.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
