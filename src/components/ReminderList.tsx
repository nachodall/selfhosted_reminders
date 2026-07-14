"use client";

import { useEffect, useRef, useState } from "react";
import type { ReminderDTO } from "@/lib/types";
import { formatStamp, relativeTime, isPast, toDateTimeLocal } from "@/lib/format";

const DELETE_THRESHOLD = -84;
const EDIT_THRESHOLD = 84;
const MAX_DRAG = 140;

export type ReminderPatch = { text: string; remindAt: string };

function EditRow({
  r,
  onSave,
  onCancel,
}: {
  r: ReminderDTO;
  onSave: (patch: ReminderPatch) => Promise<void>;
  onCancel: () => void;
}) {
  const [text, setText] = useState(r.text);
  const [when, setWhen] = useState(toDateTimeLocal(r.remindAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSave({ text: text.trim(), remindAt: new Date(when).toISOString() });
      // onSave desmonta esta fila al refrescar; no hace falta limpiar estado.
    } catch {
      setError("no se pudo guardar, probá de nuevo");
      setBusy(false);
    }
  }

  return (
    <div className="py-2.5">
      <div className="flex items-baseline gap-2">
        <span style={{ color: "var(--accent)" }}>$</span>
        <input
          className="term-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          maxLength={280}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") onCancel();
          }}
        />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span style={{ color: "var(--muted)" }}>@</span>
        <input
          type="datetime-local"
          className="term-input flex-1"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" className="term-btn" onClick={onCancel} disabled={busy}>
          cancel
        </button>
        <button type="button" className="term-btn" onClick={save} disabled={busy || !text.trim()}>
          {busy ? "…" : "save"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-[13px]" style={{ color: "var(--danger)" }}>
          ! {error}
        </p>
      )}
    </div>
  );
}

function Row({
  r,
  onDelete,
  onUpdate,
}: {
  r: ReminderDTO;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: ReminderPatch) => Promise<void>;
}) {
  const date = new Date(r.remindAt);
  const sent = r.sentAt !== null;
  const overdue = !sent && isPast(r.remindAt);

  const [editing, setEditing] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);

  const pastThreshold = dragX <= DELETE_THRESHOLD || dragX >= EDIT_THRESHOLD;
  const isDelete = dragX < 0;

  function onPointerDown(e: React.PointerEvent) {
    if (removing || editing) return;
    startX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    setDragX(Math.max(Math.min(delta, MAX_DRAG), -MAX_DRAG));
  }

  function onPointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    if (dragX <= DELETE_THRESHOLD) {
      setRemoving(true);
      setDragX(-MAX_DRAG * 2.5);
      setTimeout(() => onDelete(r.id), 160);
    } else if (dragX >= EDIT_THRESHOLD) {
      setDragX(0);
      setEditing(true);
    } else {
      setDragX(0);
    }
  }

  if (editing) {
    return (
      <li className="swipe-row" style={{ opacity: sent ? 0.7 : 1 }}>
        <EditRow
          r={r}
          onCancel={() => setEditing(false)}
          onSave={async (patch) => {
            await onUpdate(r.id, patch);
            setEditing(false);
          }}
        />
      </li>
    );
  }

  return (
    <li className="swipe-row" style={{ opacity: sent ? 0.45 : 1 }}>
      <div
        className={`swipe-reveal ${isDelete ? "is-delete" : "is-edit"} ${pastThreshold ? "past-threshold" : ""}`}
      >
        <span>{isDelete ? "rm" : "edit"}</span>
      </div>

      <div
        className="swipe-content flex items-baseline gap-3 py-2.5"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease, opacity 0.16s ease",
          opacity: removing ? 0 : 1,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="shrink-0 tabular-nums" style={{ color: "var(--accent)" }}>
          {sent ? "✓" : overdue ? "!" : "·"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-[12px]">
            <span className="tabular-nums" style={{ color: "var(--muted)" }}>
              [{formatStamp(date)}]
            </span>
            <span style={{ color: "var(--faint, var(--muted))" }}>
              {sent ? "sent" : relativeTime(date)}
            </span>
          </div>
          <p className="mt-0.5 break-words leading-snug">{r.text}</p>
        </div>
      </div>
    </li>
  );
}

export default function ReminderList({
  reminders,
  onDelete,
  onUpdate,
}: {
  reminders: ReminderDTO[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: ReminderPatch) => Promise<void>;
}) {
  // Re-render cada 30s para refrescar los tiempos relativos ("in 3h").
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (reminders.length === 0) {
    return (
      <p className="py-6 text-[13px]" style={{ color: "var(--faint, var(--muted))" }}>
        {"// no reminders yet"}
      </p>
    );
  }

  const pending = reminders.filter((r) => r.sentAt === null);
  const done = reminders
    .filter((r) => r.sentAt !== null)
    .sort((a, b) => (a.sentAt! < b.sentAt! ? 1 : -1));

  return (
    <ul className="rlist">
      {pending.map((r) => (
        <Row key={r.id} r={r} onDelete={onDelete} onUpdate={onUpdate} />
      ))}

      {done.length > 0 && (
        <li className="select-none pt-5 pb-1 text-[12px]" style={{ color: "var(--faint, var(--muted))" }}>
          — sent —
        </li>
      )}

      {done.map((r) => (
        <Row key={r.id} r={r} onDelete={onDelete} onUpdate={onUpdate} />
      ))}
    </ul>
  );
}
