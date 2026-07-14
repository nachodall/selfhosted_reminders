import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next.js 16: `params` es asíncrono (Promise).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.reminder.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { text, remindAt } = (data ?? {}) as { text?: string; remindAt?: string };

  const existing = await prisma.reminder.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const update: { text?: string; remindAt?: Date; sentAt?: Date | null } = {};

  if (text !== undefined) {
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "El texto es obligatorio" }, { status: 400 });
    }
    update.text = text.trim();
  }

  if (remindAt !== undefined) {
    const when = new Date(remindAt);
    if (Number.isNaN(when.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    update.remindAt = when;
    // Si cambió la hora, vuelve a estar "pendiente" para notificar de nuevo.
    if (when.getTime() !== existing.remindAt.getTime()) {
      update.sentAt = null;
    }
  }

  const reminder = await prisma.reminder.update({ where: { id }, data: update });
  return NextResponse.json(reminder);
}
