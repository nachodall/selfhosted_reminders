"use client";

import { useMemo, useState } from "react";
import type { ReminderDTO } from "@/lib/types";
import { toDateKey, formatTime } from "@/lib/format";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const WEEKDAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"];
const MAX_DOTS = 5;

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export default function Calendar({ reminders }: { reminders: ReminderDTO[] }) {
  const [view, setView] = useState<Date>(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<string | null>(null);

  // Cantidad de reminders por día local.
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reminders) {
      const k = toDateKey(r.remindAt);
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [reminders]);

  const todayKey = toDateKey(new Date());
  const year = view.getFullYear();
  const month = view.getMonth();

  // Grilla de celdas: blancos de relleno + días del mes, completando semanas.
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    setView(new Date(year, month + delta, 1));
    setSelected(null);
  }

  const selectedReminders = selected
    ? reminders
        .filter((r) => toDateKey(r.remindAt) === selected)
        .sort((a, b) => (a.remindAt < b.remindAt ? -1 : 1))
    : [];

  return (
    <section>
      {/* Navegación de mes */}
      <div className="mb-5 flex items-center justify-between">
        <button className="cal-nav" onClick={() => shift(-1)} aria-label="previous month">
          ‹
        </button>
        <button
          className="text-[13px] tabular-nums"
          style={{ color: "var(--fg)" }}
          onClick={() => {
            setView(startOfMonth(new Date()));
            setSelected(null);
          }}
          title="jump to today"
        >
          {MONTHS[month]} {year}
        </button>
        <button className="cal-nav" onClick={() => shift(1)} aria-label="next month">
          ›
        </button>
      </div>

      {/* Cabecera de días de la semana */}
      <div className="cal-grid mb-2 text-[11px]" style={{ color: "var(--faint, var(--muted))" }}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center">
            {w}
          </div>
        ))}
      </div>

      {/* Días */}
      <div className="cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = toDateKey(new Date(year, month, day));
          const count = counts.get(key) ?? 0;
          const isToday = key === todayKey;
          const isSelected = key === selected;
          return (
            <button
              key={i}
              className={`cal-day ${isSelected ? "is-selected" : ""}`}
              onClick={() => count > 0 && setSelected(isSelected ? null : key)}
              style={{ cursor: count > 0 ? "pointer" : "default" }}
            >
              <span
                className="cal-num tabular-nums"
                style={{ color: isToday ? "var(--accent)" : "var(--fg)" }}
              >
                {day}
              </span>
              <span className="cal-dots">
                {Array.from({ length: Math.min(count, MAX_DOTS) }).map((_, d) => (
                  <i key={d} className="cal-dot" />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detalle del día seleccionado */}
      {selected && (
        <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <p className="mb-2 text-[12px] tabular-nums" style={{ color: "var(--muted)" }}>
            {selected}
          </p>
          {selectedReminders.map((r) => {
            const sent = r.sentAt !== null;
            return (
              <div
                key={r.id}
                className="flex items-baseline gap-3 py-1.5"
                style={{ opacity: sent ? 0.45 : 1 }}
              >
                <span className="shrink-0 tabular-nums text-[12px]" style={{ color: "var(--muted)" }}>
                  {formatTime(r.remindAt)}
                </span>
                <span className="min-w-0 break-words leading-snug">{r.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
