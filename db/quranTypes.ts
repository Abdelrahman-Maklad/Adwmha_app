export interface QuranAyahRow {
  id: number;
  sora: number;
  aya_no: number;
  sora_name_ar: string;
  sora_name_en: string;
  aya_text_tashkil: string;
  page: number;
  jozz: number;
}

export interface QuranAyahViewModel {
  id: number;
  surahNumber: number;
  ayahNumber: number;
  surahNameAr: string;
  surahNameEn: string;
  textTashkeel: string;
  page: number;
  juz: number;
}
