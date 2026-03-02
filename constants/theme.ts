import { ColorSchemeName, ImageSourcePropType } from "react-native";

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export type ThemeTokens = {
  backgroundImage: ImageSourcePropType;
  overlayColor: string;
  screenBackground: string;
  topBarBackground: string;
  topBarBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  iconPrimary: string;
  iconMuted: string;
  locationPillBg: string;
  locationPillText: string;
  pointsPillBg: string;
  pointsPillLabel: string;
  pointsPillValue: string;
  calendarIconBg: string;
  calendarIconBorder: string;
  calendarIconColor: string;
  dayCardBg: string;
  dayCardBorder: string;
  dayCardSelectedBg: string;
  dayCardSelectedBorder: string;
  actionButtonBg: string;
  actionButtonBorder: string;
  headerPillBg: string;
  headerPillBorder: string;
  checklistBg: string;
  checklistBorder: string;
  modalBackdrop: string;
  modalCardBg: string;
  modalCardBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
};

export function resolveThemePreference(
  preference: ThemePreference,
  systemColorScheme: ColorSchemeName
): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  return systemColorScheme === "light" ? "light" : "dark";
}

export function cycleThemePreference(preference: ThemePreference): ThemePreference {
  if (preference === "system") return "light";
  if (preference === "light") return "dark";
  return "system";
}

export function getThemePreferenceLabel(preference: ThemePreference): string {
  if (preference === "system") return "النظام";
  if (preference === "light") return "فاتح";
  return "داكن";
}

const DARK_THEME: ThemeTokens = {
  backgroundImage: require("../assets/islamic ornament background-dark theme.png"),
  overlayColor: "rgba(10,14,26,0.88)",
  screenBackground: "#0A0E1A",
  topBarBackground: "rgba(10,14,26,0.96)",
  topBarBorder: "rgba(255,255,255,0.08)",
  textPrimary: "#E5E7EB",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textOnAccent: "#FFFFFF",
  iconPrimary: "#E5E7EB",
  iconMuted: "#9CA3AF",
  locationPillBg: "rgba(99,102,241,0.16)",
  locationPillText: "#E5E7EB",
  pointsPillBg: "rgba(16,185,129,0.15)",
  pointsPillLabel: "#A7F3D0",
  pointsPillValue: "#ECFDF5",
  calendarIconBg: "rgba(123,108,246,0.2)",
  calendarIconBorder: "rgba(167,180,252,0.35)",
  calendarIconColor: "#7B6CF6",
  dayCardBg: "rgba(255,255,255,0.04)",
  dayCardBorder: "rgba(255,255,255,0.15)",
  dayCardSelectedBg: "rgba(99,102,241,0.25)",
  dayCardSelectedBorder: "#818CF8",
  actionButtonBg: "rgba(255,255,255,0.05)",
  actionButtonBorder: "rgba(255,255,255,0.18)",
  headerPillBg: "rgba(255,255,255,0.03)",
  headerPillBorder: "rgba(255,255,255,0.13)",
  checklistBg: "rgba(255,255,255,0.02)",
  checklistBorder: "rgba(255,255,255,0.06)",
  modalBackdrop: "rgba(0,0,0,0.45)",
  modalCardBg: "#111827",
  modalCardBorder: "rgba(255,255,255,0.12)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.16)",
  inputText: "#F3F4F6",
  inputPlaceholder: "#94A3B8",
};

const LIGHT_THEME: ThemeTokens = {
  backgroundImage: require("../assets/islamic ornament background-light-theme.jpg"),
  overlayColor: "rgba(255,250,241,0.80)",
  screenBackground: "#FFF8EE",
  topBarBackground: "rgba(255,251,245,0.96)",
  topBarBorder: "rgba(99,102,241,0.16)",
  textPrimary: "#1E293B",
  textSecondary: "#334155",
  textMuted: "#64748B",
  textOnAccent: "#0F172A",
  iconPrimary: "#1E293B",
  iconMuted: "#64748B",
  locationPillBg: "rgba(99,102,241,0.12)",
  locationPillText: "#312E81",
  pointsPillBg: "rgba(16,185,129,0.16)",
  pointsPillLabel: "#166534",
  pointsPillValue: "#14532D",
  calendarIconBg: "rgba(123,108,246,0.16)",
  calendarIconBorder: "rgba(99,102,241,0.28)",
  calendarIconColor: "#4F46E5",
  dayCardBg: "rgba(255,255,255,0.78)",
  dayCardBorder: "rgba(99,102,241,0.20)",
  dayCardSelectedBg: "rgba(99,102,241,0.18)",
  dayCardSelectedBorder: "#6366F1",
  actionButtonBg: "rgba(255,255,255,0.86)",
  actionButtonBorder: "rgba(99,102,241,0.24)",
  headerPillBg: "rgba(255,255,255,0.82)",
  headerPillBorder: "rgba(99,102,241,0.22)",
  checklistBg: "rgba(255,255,255,0.80)",
  checklistBorder: "rgba(148,163,184,0.35)",
  modalBackdrop: "rgba(15,23,42,0.28)",
  modalCardBg: "#FFFFFF",
  modalCardBorder: "rgba(148,163,184,0.30)",
  inputBg: "rgba(248,250,252,0.95)",
  inputBorder: "rgba(148,163,184,0.45)",
  inputText: "#0F172A",
  inputPlaceholder: "#64748B",
};

export function getThemeTokens(theme: ResolvedTheme): ThemeTokens {
  return theme === "light" ? LIGHT_THEME : DARK_THEME;
}

