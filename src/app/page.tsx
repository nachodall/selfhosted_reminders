import { prisma } from "@/lib/prisma";
import type { ReminderDTO } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const reminders = await prisma.reminder.findMany({
    orderBy: { remindAt: "asc" },
  });

  const initial: ReminderDTO[] = reminders.map((r) => ({
    id: r.id,
    text: r.text,
    remindAt: r.remindAt.toISOString(),
    sentAt: r.sentAt ? r.sentAt.toISOString() : null,
    groupName: r.groupName,
  }));

  return <Dashboard initial={initial} />;
}
