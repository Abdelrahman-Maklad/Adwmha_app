import { RootStackParamList } from "../navigation/types";
import { getSurahAyat } from "./quranData";
import { QuranAyahViewModel } from "./quranTypes";

type QuranRouteParams = RootStackParamList["QuranReference"]["quran"];

function clampInt(value: unknown, fallback: number, min = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const normalized = Math.floor(num);
  return normalized < min ? min : normalized;
}

export async function getAyatBySurah(surah: number): Promise<QuranAyahViewModel[]> {
  const safeSurah = clampInt(surah, 1, 1);
  return getSurahAyat(safeSurah);
}

export async function getAyahBySurahAndNumber(
  surah: number,
  ayahNo: number
): Promise<QuranAyahViewModel | null> {
  const safeSurah = clampInt(surah, 1, 1);
  const safeAyah = clampInt(ayahNo, 1, 1);
  const rows = getSurahAyat(safeSurah);
  return rows.find((row) => row.ayahNumber === safeAyah) ?? null;
}

export async function getAyatRangeBySurah(
  surah: number,
  from: number,
  to: number
): Promise<QuranAyahViewModel[]> {
  const safeSurah = clampInt(surah, 1, 1);
  const safeFrom = clampInt(from, 1, 1);
  const safeTo = clampInt(to, safeFrom, 1);
  const fromAyah = Math.min(safeFrom, safeTo);
  const toAyah = Math.max(safeFrom, safeTo);
  return getSurahAyat(safeSurah).filter((row) => row.ayahNumber >= fromAyah && row.ayahNumber <= toAyah);
}

export async function fetchQuranByRouteParams(
  params: QuranRouteParams
): Promise<QuranAyahViewModel[]> {
  const safeSurah = clampInt(params?.surah, 1, 1);

  if (params?.mode === "single") {
    const ayah = clampInt(params.ayah, 1, 1);
    const row = await getAyahBySurahAndNumber(safeSurah, ayah);
    return row ? [row] : [];
  }

  if (params?.mode === "range") {
    const from = clampInt(params.from, 1, 1);
    const to = clampInt(params.to, from, 1);
    return getAyatRangeBySurah(safeSurah, from, to);
  }

  return getAyatBySurah(safeSurah);
}
