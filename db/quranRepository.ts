import { RootStackParamList } from "../navigation/types";
import { getQuranDb } from "./quranSqlite";
import { QuranAyahRow, QuranAyahViewModel } from "./quranTypes";

type QuranRouteParams = RootStackParamList["QuranReference"]["quran"];

function clampInt(value: unknown, fallback: number, min = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const normalized = Math.floor(num);
  return normalized < min ? min : normalized;
}

function mapAyahRow(row: QuranAyahRow): QuranAyahViewModel {
  return {
    id: Number(row.id),
    surahNumber: Number(row.sora),
    ayahNumber: Number(row.aya_no),
    surahNameAr: String(row.sora_name_ar ?? ""),
    surahNameEn: String(row.sora_name_en ?? ""),
    textTashkeel: String(row.aya_text_tashkil ?? ""),
    page: Number(row.page),
    juz: Number(row.jozz),
  };
}

export async function getAyatBySurah(surah: number): Promise<QuranAyahViewModel[]> {
  const safeSurah = clampInt(surah, 1, 1);
  const db = await getQuranDb();
  const rows = await db.getAllAsync<QuranAyahRow>(
    `SELECT id, sora, aya_no, sora_name_ar, sora_name_en, aya_text_tashkil, page, jozz
     FROM quran
     WHERE sora = ?
     ORDER BY aya_no ASC`,
    [safeSurah]
  );
  return rows.map(mapAyahRow);
}

export async function getAyahBySurahAndNumber(
  surah: number,
  ayahNo: number
): Promise<QuranAyahViewModel | null> {
  const safeSurah = clampInt(surah, 1, 1);
  const safeAyah = clampInt(ayahNo, 1, 1);
  const db = await getQuranDb();
  const row = await db.getFirstAsync<QuranAyahRow>(
    `SELECT id, sora, aya_no, sora_name_ar, sora_name_en, aya_text_tashkil, page, jozz
     FROM quran
     WHERE sora = ? AND aya_no = ?
     LIMIT 1`,
    [safeSurah, safeAyah]
  );
  return row ? mapAyahRow(row) : null;
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

  const db = await getQuranDb();
  const rows = await db.getAllAsync<QuranAyahRow>(
    `SELECT id, sora, aya_no, sora_name_ar, sora_name_en, aya_text_tashkil, page, jozz
     FROM quran
     WHERE sora = ? AND aya_no BETWEEN ? AND ?
     ORDER BY aya_no ASC`,
    [safeSurah, fromAyah, toAyah]
  );
  return rows.map(mapAyahRow);
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
