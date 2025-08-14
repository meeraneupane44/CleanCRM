// src/lib/dates.ts

/** Build "YYYY-MM-DD" from a Date in the *local* timezone. */
export function ymdLocalFromDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  
  /** Parse "YYYY-MM-DD" as a *local* date and format with toLocaleDateString. */
  export function formatYMDLocal(s?: string | null, locale?: string): string {
    const dt = parseYMDToLocalDate(s);
    return dt ? dt.toLocaleDateString(locale) : "—";
  }
  
  /** Parse "YYYY-MM-DD" as a *local* Date (no UTC shifting). */
  export function parseYMDToLocalDate(s?: string | null): Date | null {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
  
  /** Monday-start week helpers that operate in local time */
  export function startOfWeekLocal(d: Date): Date {
    const day = (d.getDay() + 6) % 7; // Mon=0..Sun=6
    const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    s.setDate(s.getDate() - day);
    s.setHours(0, 0, 0, 0);
    return s;
  }
  export function endOfWeekLocal(d: Date): Date {
    const s = startOfWeekLocal(d);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }
  