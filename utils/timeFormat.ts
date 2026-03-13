import type { TimeFormatPreference } from "../db/queries";
import { toArabicDigits } from "./dateFormat";

export type ResolvedTimeFormatPreference = "12h" | "24h";

export function resolveTimeFormatPreference(
  preference: TimeFormatPreference
): ResolvedTimeFormatPreference {
  if (preference === "12h" || preference === "24h") {
    return preference;
  }

  try {
    const options = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
    const hourCycle = (options as Intl.ResolvedDateTimeFormatOptions & { hourCycle?: string })
      .hourCycle;
    if (typeof options.hour12 === "boolean") {
      return options.hour12 ? "12h" : "24h";
    }

    if (hourCycle === "h11" || hourCycle === "h12") {
      return "12h";
    }
  } catch {}

  return "24h";
}

export function formatTimeByPreference(hhmm: string, preference: TimeFormatPreference): string {
  const resolvedPreference = resolveTimeFormatPreference(preference);
  const normalized = extractHHmm(hhmm);
  if (!normalized) {
    return resolvedPreference === "12h"
      ? `${toArabicDigits("05:00")} \u0635`
      : toArabicDigits("05:00");
  }

  const [hhStr, mmStr] = normalized.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) {
    return resolvedPreference === "12h"
      ? `${toArabicDigits("05:00")} \u0635`
      : toArabicDigits("05:00");
  }

  if (resolvedPreference === "24h") {
    return toArabicDigits(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  const suffix = hh >= 12 ? "\u0645" : "\u0635";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${toArabicDigits(`${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")}`)} ${suffix}`;
}

function extractHHmm(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw || raw === "api") return null;

  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
