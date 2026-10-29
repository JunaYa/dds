import { translator, type Translate } from "../i18n/translate";

const DAY_MS = 86_400_000;

export const AGE_DISPLAY_THRESHOLDS = {
  monthsAndDaysUntil: 3,
  monthsAndWeeksUntil: 6,
  monthsUntil: 24,
  yearsAndMonthsUntil: 72,
} as const;

// UTC represents calendar days here, so daylight-saving changes cannot add or lose a day.
export function calculateAge(birthday: string, now = new Date()) {
  const born = new Date(`${birthday}T00:00:00Z`);
  if (!Number.isFinite(born.getTime()) || !Number.isFinite(now.getTime()) ||
      born.toISOString().slice(0, 10) !== birthday) return null;
  const reference = new Date(0);
  reference.setUTCFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  if (reference <= born) return { months: 0, days: 0 };

  function anniversary(months: number) {
    const date = new Date(born);
    date.setUTCDate(1);
    date.setUTCMonth(born.getUTCMonth() + months + 1);
    date.setUTCDate(0);
    date.setUTCDate(Math.min(born.getUTCDate(), date.getUTCDate()));
    return date;
  }

  let months = (reference.getUTCFullYear() - born.getUTCFullYear()) * 12 +
    reference.getUTCMonth() - born.getUTCMonth();
  if (anniversary(months) > reference) months--;
  return { months, days: (reference.getTime() - anniversary(months).getTime()) / DAY_MS };
}

export function formatAge(birthday: string, now = new Date(), tr: Translate = translator("en")) {
  const result = calculateAge(birthday, now);
  if (!result) return tr("Age unavailable");
  const { months, days } = result;
  const dayText = (count: number) => count === 1 ? tr("1 day") : tr("{count} days", { count });
  const weekText = (count: number) => count === 1 ? tr("1 week") : tr("{count} weeks", { count });
  const monthText = (count: number) => count === 1 ? tr("1 month") : tr("{count} months", { count });
  if (months === 0) return dayText(days);
  if (months < AGE_DISPLAY_THRESHOLDS.monthsAndDaysUntil) {
    return days ? tr("{months}, {days}", { months: monthText(months), days: dayText(days) }) : monthText(months);
  }
  if (months < AGE_DISPLAY_THRESHOLDS.monthsAndWeeksUntil) {
    const weeks = Math.floor(days / 7);
    return weeks ? tr("{months}, {weeks}", { months: monthText(months), weeks: weekText(weeks) }) : monthText(months);
  }
  if (months < AGE_DISPLAY_THRESHOLDS.monthsUntil) return monthText(months);
  const years = Math.floor(months / 12);
  const yearText = years === 1 ? tr("1 year") : tr("{count} years", { count: years });
  const remainder = months % 12;
  return months < AGE_DISPLAY_THRESHOLDS.yearsAndMonthsUntil && remainder
    ? tr("{years}, {months}", { years: yearText, months: monthText(remainder) })
    : yearText;
}
