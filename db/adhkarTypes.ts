export type AdhkarSetType = string;

export type AdhkarPriority = 1 | 2 | 3;

export type AdhkarContentType = "text" | "quran";

export type QuranRenderMode = "full" | "single" | "range";

export interface QuranReference {
  surah: number;
  mode: QuranRenderMode;
  ayah?: number;
  from?: number;
  to?: number;
}

export interface AdhkarItem {
  id: string;
  key: string;
  text_ar: string;
  reference?: string;
  refrence?: string;
  repeat: number;
  priority: AdhkarPriority;
  content_type?: AdhkarContentType;
  quran?: QuranReference;
}

export interface AdhkarSetMetadata {
  version: number;
  language: "ar";
  createdAt: string;
  updatedAt: string;
}

export interface AdhkarSetDoc {
  _id: string;
  type: AdhkarSetType;
  title_ar: string;
  items: AdhkarItem[];
  metadata: AdhkarSetMetadata;
}
