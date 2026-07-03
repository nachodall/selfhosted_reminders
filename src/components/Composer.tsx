"use client";

import { useState } from "react";
import { defaultDateTimeLocal } from "@/lib/format";

export default function Composer({ onCreated }: { onCreated: () => void }) {
  const [text, setText] = useState("");
  const [when, setWhen] = useState(defaultDateTimeLocal());
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
        body: JSON.stringify({ text: text.trim(), remindAt }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo crear");
        return;
      }
      setText("");
      setWhen(defaultDateTimeLocal());
      onCreated();
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
