/**
 * Shared date/time helpers.
 *
 * All memo action timestamps must be produced in Thailand time regardless of
 * where the code runs (browser, local dev server, or a UTC cloud server).
 * Using `toTimeString()` / `toISOString()` directly causes a 7-hour offset when
 * the server runs in UTC, so always go through these helpers instead.
 */
export const APP_TIME_ZONE = 'Asia/Bangkok';

function bangkokParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  };
}

/** `YYYY-MM-DD` in Thailand time. */
export function formatActionDate(date: Date = new Date()): string {
  const { year, month, day } = bangkokParts(date);
  return `${year}-${month}-${day}`;
}

/** `HH:mm` (24h) in Thailand time. */
export function formatActionTime(date: Date = new Date()): string {
  const { hour, minute } = bangkokParts(date);
  return `${hour}:${minute}`;
}

/** Thai long date + time, e.g. `2 พฤศจิกายน 2569 10:35 น.`. */
export function formatThaiDateTime(date: Date): string {
  const day = date.toLocaleDateString('th-TH', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = date.toLocaleTimeString('th-TH', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} ${time} น.`;
}

/** Thai long date (Buddhist year), e.g. `2 พฤศจิกายน 2569`. */
export function formatThaiDate(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    timeZone: APP_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
