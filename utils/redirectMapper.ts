import { ADHKAR_SEED_DOCS } from "../db/adhkarData";

export type AdhkarSetId = string;

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
    .replace(/[_:-]+/g, " ")
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/[\u064b\u064c\u064d\u064e\u064f\u0650\u0651\u0652]/g, "")
    .trim();
}

const QURAN_REDIRECT_ALIASES: Array<
  [string, { titleAr: string; quran: Extract<RedirectTarget, { kind: "quran" }>["quran"] }]
> = [
  [
    "\u0633\u0648\u0631\u0647 \u0627\u0644\u0643\u0647\u0641",
    {
      titleAr: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
      quran: { surah: 18, mode: "full" },
    },
  ],
  [
    "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
    {
      titleAr: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
      quran: { surah: 18, mode: "full" },
    },
  ],
  [
    "surah al kahf",
    {
      titleAr: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
      quran: { surah: 18, mode: "full" },
    },
  ],
  [
    "surah kahf",
    {
      titleAr: "\u0633\u0648\u0631\u0629 \u0627\u0644\u0643\u0647\u0641",
      quran: { surah: 18, mode: "full" },
    },
  ],
];

function buildAdhkarRedirectMap() {
  const map = new Map<string, AdhkarSetId>();

  const addAlias = (alias: string, setId: string) => {
    const normalized = normalizeRedirectLabel(alias);
    if (!normalized || map.has(normalized)) return;
    map.set(normalized, setId);
  };

  for (const doc of ADHKAR_SEED_DOCS) {
    addAlias(doc._id, doc._id);
    addAlias(doc.title_ar, doc._id);
    addAlias(doc._id.replace(/^adhkar[_\s-]*/i, ""), doc._id);
    addAlias(`adhkar ${doc._id.replace(/^adhkar[_\s-]*/i, "").replace(/[_:-]+/g, " ")}`, doc._id);
    addAlias(`adhkar ${doc.type}`, doc._id);
  }

  return map;
}

const ADHKAR_REDIRECT_MAP = buildAdhkarRedirectMap();

const QURAN_REDIRECT_MAP = new Map(
  QURAN_REDIRECT_ALIASES.map(([alias, value]) => [
    normalizeRedirectLabel(alias),
    { kind: "quran" as const, titleAr: value.titleAr, quran: value.quran },
  ])
);

export function mapRedirectLabel(label: string): RedirectTarget | null {
  const normalized = normalizeRedirectLabel(label);
  if (!normalized) return null;

  const quranTarget = QURAN_REDIRECT_MAP.get(normalized);
  if (quranTarget) {
    return quranTarget;
  }

  const adhkarSetId = ADHKAR_REDIRECT_MAP.get(normalized);
  if (adhkarSetId) {
    return { kind: "adhkar", setId: adhkarSetId };
  }

  return null;
}
