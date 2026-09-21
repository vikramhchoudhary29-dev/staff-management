import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function monthFromDate(value?: string | null) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  return new Date().toISOString().slice(0, 7);
}

export async function POST(req: Request) {
  const body = await req.json();
  const salary = Number(body.salary);
  if (!body.name || !Number.isFinite(salary) || salary < 0) {
    return NextResponse.json({ error: "Name and valid salary are required." }, { status: 400 });
  }
  const joiningDate = body.joiningDate ? new Date(`${body.joiningDate}T00:00:00Z`) : null;
  if (body.joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.joiningDate))) {
    return NextResponse.json({ error: "Invalid joining date." }, { status: 400 });
  }
  const staff = await prisma.staff.create({
    data: {
      name: String(body.name).trim(),
      phone: body.phone || null,
      role: body.role || null,
      salary,
      joiningDate,
      active: body.active !== false,
      salaryHistory: {
        create: {
          month: monthFromDate(body.joiningDate),
          salary,
          notes: "Initial salary"
        }
      }
    },
    include: { salaryHistory: true }
  });
  return NextResponse.json(staff);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const salary = Number(body.salary);
  if (!body.id || !body.name || !Number.isFinite(salary) || salary < 0) {
    return NextResponse.json({ error: "Valid staff and salary are required." }, { status: 400 });
  }
  const joiningDate = body.joiningDate ? new Date(`${body.joiningDate}T00:00:00Z`) : null;
  if (body.joiningDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.joiningDate))) {
    return NextResponse.json({ error: "Invalid joining date." }, { status: 400 });
  }
  const staff = await prisma.staff.update({
    where: { id: Number(body.id) },
    data: {
      name: String(body.name).trim(),
      phone: body.phone || null,
      role: body.role || null,
      salary,
      joiningDate,
      active: Boolean(body.active)
    }
  });
  const currentMonth = new Date().toISOString().slice(0, 7);
  await prisma.salaryHistory.upsert({
    where: { staffId_month: { staffId: Number(body.id), month: currentMonth } },
    update: { salary, notes: "Current salary" },
    create: { staffId: Number(body.id), month: currentMonth, salary, notes: "Current salary" }
  });
  if (body.joiningDate) {
    const joiningMonth = String(body.joiningDate).slice(0, 7);
    const joiningHistory = await prisma.salaryHistory.findUnique({
      where: { staffId_month: { staffId: Number(body.id), month: joiningMonth } },
      select: { id: true }
    });
    if (!joiningHistory) {
      await prisma.salaryHistory.create({
        data: { staffId: Number(body.id), month: joiningMonth, salary, notes: "Initial salary (added automatically)" }
      });
    }
  }
  const result = await prisma.staff.findUnique({ where: { id: Number(body.id) }, include: { salaryHistory: true } });
  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  await prisma.staff.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
