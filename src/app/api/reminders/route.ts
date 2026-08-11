import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const reminders = await prisma.reminder.findMany({
    orderBy: { remindAt: "asc" },
  });
  return NextResponse.json(reminders);
}

export async function POST(request: Request) {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { text, remindAt, groupName } = (data ?? {}) as {
    text?: string;
    remindAt?: string;
    groupName?: string | null;
  };

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "El texto es obligatorio" }, { status: 400 });
  }
  if (!remindAt) {
    return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  }

  const when = new Date(remindAt);
  if (Number.isNaN(when.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const reminder = await prisma.reminder.create({
    data: {
      text: text.trim(),
      remindAt: when,
      groupName: groupName?.trim() || null,
    },
  });

  return NextResponse.json(reminder, { status: 201 });
}
