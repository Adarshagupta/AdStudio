const STUDIO_DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
};

/** Stable en-US formatting — avoids SSR/client locale hydration mismatches. */
export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", STUDIO_DATE_TIME_FORMAT).format(date);
}
