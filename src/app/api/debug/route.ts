import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Ruta temporal de diagnóstico — borrar después de investigar el bug de tz.
export async function GET() {
  const [reminders, subs] = await Promise.all([
    prisma.reminder.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.pushSubscription.findMany({
      select: { id: true, endpoint: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({ now: new Date().toISOString(), reminders, subscriptions: subs });
}
