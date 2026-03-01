export type AdhkarSetId = "adhkar_morning" | "adhkar_evening";

export type RedirectTarget =
  | { kind: "adhkar"; setId: AdhkarSetId }
  | {
      kind: "quran";
      titleAr: string;
      quran: {
        surah: number;
        mode: "full" | "single" | "range";
        ayah?: number;
        from?: number;
        to?: number;
      };
    };

function normalizeRedirectLabel(label: string) {
  return String(label ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/[\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652]/g, "");
}

const ADHKAR_MORNING_LABEL = "\u0627\u0630\u0643\u0627\u0631 \u0627\u0644\u0635\u0628\u0627\u062d";
const ADHKAR_EVENING_LABEL = "\u0627\u0630\u0643\u0627\u0631 \u0627\u0644\u0645\u0633\u0627\u0621";
const SURAH_KAHF_LABEL_1 = "\u0633\u0648\u0631\u0647 \u0627\u0644\u0643\u0647\u0641";
const SURAH_KAHF_LABEL_2 = "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641";

export function mapRedirectLabel(label: string): RedirectTarget | null {
  const normalized = normalizeRedirectLabel(label);
  if (!normalized) return null;

  if (normalized === ADHKAR_MORNING_LABEL || normalized === "adhkar morning") {
    return { kind: "adhkar", setId: "adhkar_morning" };
  }

  if (normalized === ADHKAR_EVENING_LABEL || normalized === "adhkar evening") {
    return { kind: "adhkar", setId: "adhkar_evening" };
  }

  if (
    normalized === SURAH_KAHF_LABEL_1 ||
    normalized === SURAH_KAHF_LABEL_2 ||
    normalized === "surah al kahf" ||
    normalized === "surah kahf"
  ) {
    return {
      kind: "quran",
      titleAr: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
      quran: {
        surah: 18,
        mode: "full",
      },
    };
  }

  return null;
}
