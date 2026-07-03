"use client";

import { useEffect, useRef, useState } from "react";
import type { ReminderDTO } from "@/lib/types";
import { formatStamp, relativeTime, isPast } from "@/lib/format";

const DELETE_THRESHOLD = -84;
const MAX_DRAG = -140;

function Row({
  r,
  onDelete,
}: {
  r: ReminderDTO;
  onDelete: (id: string) => void;
}) {
  const date = new Date(r.remindAt);
  const sent = r.sentAt !== null;
  const overdue = !sent && isPast(r.remindAt);

  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [removing, setRemoving] = useState(false);
  const startX = useRef<number | null>(null);
  const pastThreshold = dragX <= DELETE_THRESHOLD;

  function onPointerDown(e: React.PointerEvent) {
    if (removing) return;
    startX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    setDragX(Math.max(Math.min(delta, 0), MAX_DRAG));
  }

  function onPointerUp() {
    if (startX.current === null) return;
    startX.current = null;
    setDragging(false);
    if (dragX <= DELETE_THRESHOLD) {
      setRemoving(true);
      setDragX(MAX_DRAG * 2.5);
      setTimeout(() => onDelete(r.id), 160);
    } else {
      setDragX(0);
    }
  }

  return (
    <li className="swipe-row" style={{ opacity: sent ? 0.45 : 1 }}>
      <div className={`swipe-reveal ${pastThreshold ? "past-threshold" : ""}`}>
        <span>rm</span>
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
}: {
  reminders: ReminderDTO[];
  onDelete: (id: string) => void;
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
        <Row key={r.id} r={r} onDelete={onDelete} />
      ))}

      {done.length > 0 && (
        <li className="select-none pt-5 pb-1 text-[12px]" style={{ color: "var(--faint, var(--muted))" }}>
          — sent —
        </li>
      )}

      {done.map((r) => (
        <Row key={r.id} r={r} onDelete={onDelete} />
      ))}
    </ul>
  );
}
