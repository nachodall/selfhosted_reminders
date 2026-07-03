import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendToAll } from "@/lib/push";

/**
 * Revisa recordatorios vencidos (remindAt <= ahora, sentAt == null),
 * manda push y los marca como enviados.
 *
 * Autenticación: header `Authorization: Bearer <CRON_SECRET>`.
 * Lo usan el scheduler local (npm run scheduler) y Vercel Cron (fase 2).
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const now = new Date();
  const due = await prisma.reminder.findMany({
    where: { remindAt: { lte: now }, sentAt: null },
    orderBy: { remindAt: "asc" },
  });

  let delivered = 0;
  for (const reminder of due) {
    const count = await sendToAll({
      title: "⏰ Recordatorio",
      body: reminder.text,
      reminderId: reminder.id,
    });
    delivered += count;
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: new Date() },
    });
  }

  return NextResponse.json({
    checked: due.length,
    delivered,
    at: now.toISOString(),
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
