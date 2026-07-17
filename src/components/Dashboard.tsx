"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReminderDTO } from "@/lib/types";
import NotificationBar from "@/components/NotificationBar";
import Composer from "@/components/Composer";
import ReminderList, { type ReminderPatch } from "@/components/ReminderList";
import Calendar from "@/components/Calendar";
import { registerServiceWorker } from "@/lib/client-push";

type View = "list" | "cal";

export default function Dashboard({ initial }: { initial: ReminderDTO[] }) {
  const [reminders, setReminders] = useState<ReminderDTO[]>(initial);
  const [view, setView] = useState<View>("list");
  // Arranca en "online" siempre (coincide con el server, que no tiene
  // navigator.onLine) — el valor real se corrige en el efecto de abajo,
  // después del mount, para no romper la hidratación.
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders", { cache: "no-store" });
      if (res.ok) {
        setReminders(await res.json());
        setOffline(false);
      }
    } catch {
      // Sin red: dejamos lo que hay en pantalla (última versión conocida).
      setOffline(true);
    }
  }, []);

  // Registra el SW ya desde el arranque (no solo al habilitar notificaciones)
  // para que la app pueda abrir sin conexión — ver <when_to_verify> en sw.js.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // navigator.onLine detecta el corte al toque; el refresh confirma que
  // realmente hay red hasta el servidor (no solo wifi sin internet).
  useEffect(() => {
    const onOnline = () => refresh();
    const onOffline = () => setOffline(true);
    if (!navigator.onLine) onOffline();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refresh]);

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
    const prev = reminders;
    setReminders((p) => p.filter((r) => r.id !== id)); // optimista
    try {
      const res = await fetch(`/api/reminders/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      refresh();
    } catch {
      setReminders(prev); // revertir: no había red, no se borró de verdad
      setOffline(true);
    }
  }

  async function handleUpdate(id: string, patch: ReminderPatch) {
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("update failed");
      await refresh();
    } catch (err) {
      setOffline(!navigator.onLine);
      throw err; // EditRow ya muestra su propio mensaje de error
    }
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

      {offline && (
        <p className="mb-6 text-[13px]" style={{ color: "var(--muted)" }}>
          ○ offline — mostrando la última sincronización. Crear, editar y borrar
          necesitan conexión.
        </p>
      )}

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
