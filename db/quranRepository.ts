import { RootStackParamList } from "../navigation/types";
import { getSurahText } from "./quranData";

type QuranRouteParams = RootStackParamList["QuranReference"]["quran"];

function clampInt(value: unknown, fallback: number, min = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const normalized = Math.floor(num);
  return normalized < min ? min : normalized;
}

export async function getAyatBySurah(surah: number): Promise<string> {
  const safeSurah = clampInt(surah, 1, 1);
  return getSurahText(safeSurah);
}

export async function getAyahBySurahAndNumber(surah: number, ayahNo: number): Promise<string> {
  return getAyatBySurah(surah);
}

export async function getAyatRangeBySurah(surah: number, from: number, to: number): Promise<string> {
  return getAyatBySurah(surah);
}

export async function fetchQuranByRouteParams(params: QuranRouteParams): Promise<string> {
  const safeSurah = clampInt(params?.surah, 1, 1);

  if (params?.mode === "single") {
    return getAyahBySurahAndNumber(safeSurah, clampInt(params.ayah, 1, 1));
  }

  if (params?.mode === "range") {
    return getAyatRangeBySurah(safeSurah, clampInt(params.from, 1, 1), clampInt(params.to, 1, 1));
  }

  return getAyatBySurah(safeSurah);
}
