export function formatAyahMarker(ayahNumber: number): string {
  const n = Math.max(1, Math.floor(Number(ayahNumber) || 1));
  const arabicDigits = String(n).replace(/\d/g, (digit) =>
    String.fromCharCode(0x0660 + Number(digit))
  );
  return `${arabicDigits}`;
}
