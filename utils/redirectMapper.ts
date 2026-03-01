export type AdhkarSetId = "adhkar_morning" | "adhkar_evening";

export function mapRedirectLabelToSetId(label: string): AdhkarSetId | null {
  const normalized = String(label ?? "").trim();
  if (!normalized) return null;

  if (normalized === "أذكار الصباح") return "adhkar_morning";
  if (normalized === "أذكار المساء") return "adhkar_evening";

  return null;
}
