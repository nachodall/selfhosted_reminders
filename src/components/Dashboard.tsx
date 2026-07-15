"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReminderDTO } from "@/lib/types";
import NotificationBar from "@/components/NotificationBar";
import Composer from "@/components/Composer";
import ReminderList, { type ReminderPatch } from "@/components/ReminderList";
import Calendar from "@/components/Calendar";

type View = "list" | "cal";

export default function Dashboard({ initial }: { initial: ReminderDTO[] }) {
  const [reminders, setReminders] = useState<ReminderDTO[]>(initial);
  const [view, setView] = useState<View>("list");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (res.ok) setReminders(await res.json());
    } catch {
      /* offline: dejamos lo que hay */
    }
  }, []);

  // Polling suave: refleja recordatorios que el scheduler marcó como enviados.
  useEffect(() => {
    const t = setInterval(refresh, 20_000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  async function handleDelete(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id)); // optimista
    await fetch(`/api/reminders/${id}`, { method: "DELETE" }).catch(() => {});
    refresh();
  }

  async function handleUpdate(id: string, patch: ReminderPatch) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("update failed");
    await refresh();
  }

  const pendingCount = reminders.filter((r) => r.sentAt === null).length;

  return (
    <main className="page-shell mx-auto w-full max-w-[620px] px-5 pb-24">
      <header className="mb-8">
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg" style={{ color: "var(--fg)" }}>
            <span style={{ color: "var(--accent)" }}>~/</span>reminders
            <span className="cursor" />
          </h1>
          <span className="text-[13px] tabular-nums" style={{ color: "var(--muted)" }}>
            {pendingCount} pending
          </span>
        </div>

        <nav className="mt-3 flex items-center gap-4 text-[13px]">
          {(["list", "cal"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="tab"
              style={{ color: view === v ? "var(--accent)" : "var(--muted)" }}
              aria-current={view === v}
            >
              {v}
            </button>
          ))}
        </nav>
      </header>

      {view === "list" ? (
        <>
          <NotificationBar />
          <Composer onCreated={refresh} />
          <ReminderList reminders={reminders} onDelete={handleDelete} onUpdate={handleUpdate} />
        </>
      ) : (
        <Calendar reminders={reminders} />
      )}
    </main>
  );
}
