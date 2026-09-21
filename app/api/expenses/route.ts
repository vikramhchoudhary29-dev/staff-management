import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ExpenseItem = {
  staffId: number;
  title: string;
  amount: number;
  date: string;
  notes: string | null;
};

type StaffRow = {
  id: number;
  joiningDate: Date | null;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Bulk mode: several separate expense records can be saved in one request.
    if (Array.isArray(body.items)) {
      const items: ExpenseItem[] = body.items.map((item: unknown) => {
        const data = item as Record<string, unknown>;

        return {
          staffId: Number(data.staffId),
          title: String(data.title || "").trim(),
          amount: Number(data.amount),
          date: String(data.date || ""),
          notes: data.notes ? String(data.notes).trim() : null,
        };
      });

      if (!items.length) {
        return NextResponse.json(
          { error: "Add at least one expense row." },
          { status: 400 }
        );
      }

      for (const item of items) {
        if (
          !item.staffId ||
          !item.title ||
          !Number.isFinite(item.amount) ||
          item.amount < 0 ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
        ) {
          return NextResponse.json(
            {
              error:
                "Every expense needs a staff member, title, valid amount and date.",
            },
            { status: 400 }
          );
        }
      }

      const staffIds: number[] = Array.from(
        new Set<number>(
          items.map((item: ExpenseItem) => item.staffId)
        )
      );

      const staffRows: StaffRow[] = await prisma.staff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, joiningDate: true },
      });

      const staffMap = new Map<number, StaffRow>(
        staffRows.map(
          (staff: StaffRow): [number, StaffRow] => [staff.id, staff]
        )
      );

      for (const item of items) {
        const staff = staffMap.get(item.staffId);

        if (!staff) {
          return NextResponse.json(
            { error: `Staff member ${item.staffId} was not found.` },
            { status: 404 }
          );
        }

        if (
          staff.joiningDate &&
          item.date < staff.joiningDate.toISOString().slice(0, 10)
        ) {
          return NextResponse.json(
            {
              error: `${item.title}: expense cannot be dated before the joining date (${staff.joiningDate
                .toISOString()
                .slice(0, 10)}).`,
            },
            { status: 400 }
          );
        }
      }

      const saved = await prisma.$transaction(
        items.map((item: ExpenseItem) =>
          prisma.staffExpense.create({
            data: {
              staffId: item.staffId,
              title: item.title,
              amount: item.amount,
              date: new Date(`${item.date}T00:00:00Z`),
              category: null,
              notes: item.notes,
            },
            include: { staff: true },
          })
        )
      );

      return NextResponse.json(saved);
    }

    const staffId = Number(body.staffId);
    const amount = Number(body.amount);
    const date = String(body.date || "");
    const title = String(body.title || "").trim();

    if (
      !staffId ||
      !title ||
      !Number.isFinite(amount) ||
      amount < 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      return NextResponse.json(
        { error: "Staff, title, date and valid amount are required." },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { joiningDate: true },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found." },
        { status: 404 }
      );
    }

    if (
      staff.joiningDate &&
      date < staff.joiningDate.toISOString().slice(0, 10)
    ) {
      return NextResponse.json(
        {
          error: `Expense cannot be dated before the joining date (${staff.joiningDate
            .toISOString()
            .slice(0, 10)}).`,
        },
        { status: 400 }
      );
    }

    const expense = await prisma.staffExpense.create({
      data: {
        staffId,
        title,
        amount,
        date: new Date(`${date}T00:00:00Z`),
        category: null,
        notes: body.notes ? String(body.notes) : null,
      },
      include: { staff: true },
    });

    return NextResponse.json(expense);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save expense(s).";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json(
        { error: "Valid expense ID is required." },
        { status: 400 }
      );
    }

    await prisma.staffExpense.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to delete expense.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
