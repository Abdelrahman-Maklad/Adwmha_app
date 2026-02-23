// utils/dateFormat.ts
import { DateInfo } from "../services/prayerTimes";

/**
 * Convert Western Arabic numerals (0-9) to Eastern Arabic numerals (٠-٩)
 */
export function toArabicDigits(input: string | number): string {
  const map: Record<string, string> = {
    "0": "٠",
    "1": "١",
    "2": "٢",
    "3": "٣",
    "4": "٤",
    "5": "٥",
    "6": "٦",
    "7": "٧",
    "8": "٨",
    "9": "٩",
  };
  return String(input).replace(/[0-9]/g, (d) => map[d]);
}

/**
 * Format Hijri date in full Arabic format
 * Example: "الأحد ١٥ شعبان ١٤٤٦هـ"
 */
export function formatHijriDate(dateInfo: DateInfo["hijri"]): string {
  const day = toArabicDigits(dateInfo.day);
  const year = toArabicDigits(dateInfo.year);
  return `${dateInfo.weekdayAr} ${day} ${dateInfo.monthAr} ${year}هـ`;
}

/**
 * Format Georgian date
 * Example: "الأحد، ١٦ فبراير ٢٠٢٥"
 */
export function formatGregorianDate(dateInfo: DateInfo["gregorian"]): string {
  const weekdays: Record<string, string> = {
    Sunday: "الأحد",
    Monday: "الاثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
    Thursday: "الخميس",
    Friday: "الجمعة",
    Saturday: "السبت",
  };

  const months: Record<string, string> = {
    January: "يناير",
    February: "فبراير",
    March: "مارس",
    April: "أبريل",
    May: "مايو",
    June: "يونيو",
    July: "يوليو",
    August: "أغسطس",
    September: "سبتمبر",
    October: "أكتوبر",
    November: "نوفمبر",
    December: "ديسمبر",
  };

  const weekdayAr = weekdays[dateInfo.weekday] ?? dateInfo.weekday;
  const monthAr = months[dateInfo.month] ?? dateInfo.month;

  return `${weekdayAr}، ${toArabicDigits(dateInfo.day)} ${monthAr} ${toArabicDigits(
    dateInfo.year
  )}`;
}

/**
 * Format time to Arabic format
 * Example: "ص ٥:٠١" (for AM) or "م ٧:٠٥" (for PM)
 */
export function formatTimeLabel(hhmm: string): string {
  if (!hhmm || hhmm === "api") return "ص ٥:٠٠";

  const [hhStr, mmStr] = hhmm.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);

  const isPM = hh >= 12;
  const period = isPM ? "م" : "ص";

  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;

  const label = `${period} ${h12}:${String(mm).padStart(2, "0")}`;
  return toArabicDigits(label);
}

/**
 * Get current Hijri date when API date is not available
 * Uses a simple approximation - for accurate date, use API
 */
export function getFallbackHijriDate(): DateInfo["hijri"] {
  // This is a rough approximation - the API will provide accurate dates
  return {
    day: "1",
    monthAr: "رمضان",
    year: "1447",
    weekdayAr: "الأحد",
  };
}

/**
 * Get current Georgian date
 */
export function getCurrentGregorianDate(): DateInfo["gregorian"] {
  const now = new Date();
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return {
    day: String(now.getDate()),
    month: months[now.getMonth()],
    year: String(now.getFullYear()),
    weekday: days[now.getDay()],
  };
}
