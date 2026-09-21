import { config } from "@/lib/config";

/**
 * Returns the current calendar date (YYYY-MM-DD) in the configured reset
 * timezone. Used to decide whether a slot's daily state is stale.
 */
export function currentDateKey(now: Date = new Date(), timeZone: string = config.resetTimezone): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

/**
 * Converts a YYYY-MM-DD calendar date key into a UTC-midnight Date, which
 * is how Prisma's `@db.Date` columns store dates.
 */
export function dateKeyToUtcDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function isSameDateKey(date: Date, dateKey: string): boolean {
  return date.toISOString().slice(0, 10) === dateKey;
}
