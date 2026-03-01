export const FONT_FAMILY = {
  cairoRegular: "Cairo-Regular",
  cairoSemiBold: "Cairo-SemiBold",
  cairoBold: "Cairo-Bold",
  hafs: "Hafs",
} as const;

export function resolveArabicTextFont(preferHafs: boolean, hasHafsFont: boolean): string {
  if (preferHafs && hasHafsFont) return FONT_FAMILY.hafs;
  return FONT_FAMILY.cairoRegular;
}
