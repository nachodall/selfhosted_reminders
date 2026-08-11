"use client";

import { useState } from "react";
import { defaultDateTimeLocal } from "@/lib/format";
import { groupColorClass } from "@/lib/groupColor";

export default function Composer({
  onCreated,
  existingGroups,
}: {
  onCreated: () => void;
  existingGroups: string[];
}) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState(defaultDateTimeLocal());
  const [group, setGroup] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      // `when` es un string "naive" (sin zona horaria) de <input datetime-local>.
      // Lo convertimos a un instante UTC acá, en el navegador, donde sí sabemos
      // la zona horaria real del usuario — si se manda tal cual, el servidor lo
      // interpreta como UTC y el recordatorio queda desfasado.
      const remindAt = new Date(when).toISOString();
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), remindAt, groupName: group.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo crear");
        return;
      }
      setText("");
      setWhen(defaultDateTimeLocal());
      setGroup("");
      onCreated();
    } catch {
      // Fallo de red (ej. iPhone sin señal al tocar add): no lo tragamos en
      // silencio — antes el recordatorio "desaparecía" sin dejar rastro.
      setError("sin conexión — no se guardó, probá de nuevo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-10 border-t border-b py-4"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex items-baseline gap-2">
        <span style={{ color: "var(--accent)" }}>$</span>
        <input
          className="term-input"
          placeholder="new reminder…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          maxLength={280}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <span
          className={group.trim() ? groupColorClass(group) : undefined}
          style={{ color: group.trim() ? undefined : "var(--muted)" }}
        >
          #
        </span>
        <input
          className="term-input"
          placeholder="group (optional)"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          list="existing-groups"
          maxLength={60}
        />
        <datalist id="existing-groups">
          {existingGroups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span style={{ color: "var(--muted)" }}>@</span>
        <input
          type="datetime-local"
          className="term-input flex-1"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
        <button type="submit" className="term-btn shrink-0" disabled={busy || !text.trim()}>
          {busy ? "…" : "add"}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }}>
          ! {error}
        </p>
      )}
    </form>
  );
}
