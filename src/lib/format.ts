/** Formatea una fecha como `2026-07-01 09:00` (timestamp tabular para la lista). */
export function formatStamp(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ` +
    `${p(date.getHours())}:${p(date.getMinutes())}`
  );
}

/** "in 3h", "in 2d", "now", "5m ago" — relativo y compacto. */
export function relativeTime(date: Date, from: Date = new Date()): string {
  const diffMs = date.getTime() - from.getTime();
  const past = diffMs < 0;
  const abs = Math.abs(diffMs);
  const min = Math.round(abs / 60000);

  if (min < 1) return "now";
  let value: string;
  if (min < 60) value = `${min}m`;
  else if (min < 60 * 24) value = `${Math.round(min / 60)}h`;
  else value = `${Math.round(min / (60 * 24))}d`;

  return past ? `${value} ago` : `in ${value}`;
}

/** True si la fecha ya pasó respecto de ahora. */
export function isPast(iso: string): boolean {
  return new Date(iso).getTime() < Date.now();
}

/** Clave de día local `YYYY-MM-DD` (para agrupar reminders por día en el calendario). */
export function toDateKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Hora local `HH:mm`. */
export function formatTime(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Valor por defecto para <input type="datetime-local">: ahora + 1h, redondeado. */
export function defaultDateTimeLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return toDateTimeLocal(d);
}

/** Convierte una fecha (ISO o Date) al string local que espera <input datetime-local>. */
export function toDateTimeLocal(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
