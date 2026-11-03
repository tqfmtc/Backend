// India time helpers. The server runs on UTC, and attendance dates are stored as UTC
// midnight of the calendar day (e.g. 2026-11-03T00:00:00Z). These helpers pick that
// calendar day in IST, so attendance marked between 00:00 and 05:30 IST lands on the
// right day instead of the previous one. India has no DST, so a fixed offset is exact.
export const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

const istClock = (date = new Date(Date.now())) => new Date(date.getTime() + IST_OFFSET_MS);

// Today's IST calendar date, as UTC midnight (the format attendance dates are stored in)
export const istToday = () => {
  const ist = istClock();
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
};

// 0 = Sunday ... 6 = Saturday, in IST
export const istDayOfWeek = () => istClock().getUTCDay();

// The real instants at which today's IST day starts and ends (for createdAt-style timestamps)
export const istTodayBounds = () => {
  const start = new Date(istToday().getTime() - IST_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
};

// "h:mm AM/PM" in IST
export const formatIstTime = (date) => {
  const ist = istClock(new Date(date));
  const h = ist.getUTCHours();
  const m = ist.getUTCMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
