import { AdhkarPriority } from "../db/adhkarTypes";
import { ResolvedTheme } from "./theme";

export type PriorityColors = {
  cardBackground: string;
  borderColor: string;
  textColor: string;
  badgeBackground: string;
  badgeText: string;
  counterText: string;
  completionOverlay: string;
  shimmerStops?: string[];
};

const DARK_ADHKAR_PRIORITY_COLORS: Record<AdhkarPriority, PriorityColors> = {
  1: {
    cardBackground: "rgba(212,175,55,0.12)",
    borderColor: "#D4AF37",
    textColor: "#F8FAFC",
    badgeBackground: "rgba(212,175,55,0.22)",
    badgeText: "#FDE68A",
    counterText: "#FDE68A",
    completionOverlay: "rgba(10,14,26,0.36)",
    shimmerStops: ["rgba(212,175,55,0.00)", "rgba(255,226,126,0.22)", "rgba(212,175,55,0.00)"],
  },
  2: {
    cardBackground: "rgba(31,122,76,0.16)",
    borderColor: "#1F7A4C",
    textColor: "#E5E7EB",
    badgeBackground: "rgba(31,122,76,0.28)",
    badgeText: "#BBF7D0",
    counterText: "#BBF7D0",
    completionOverlay: "rgba(10,14,26,0.34)",
  },
  3: {
    cardBackground: "rgba(148,163,184,0.10)",
    borderColor: "rgba(148,163,184,0.35)",
    textColor: "#E2E8F0",
    badgeBackground: "rgba(148,163,184,0.22)",
    badgeText: "#CBD5E1",
    counterText: "#CBD5E1",
    completionOverlay: "rgba(10,14,26,0.34)",
  },
};

const LIGHT_ADHKAR_PRIORITY_COLORS: Record<AdhkarPriority, PriorityColors> = {
  1: {
    cardBackground: "rgba(212,175,55,0.16)",
    borderColor: "#B8860B",
    textColor: "#1F2937",
    badgeBackground: "rgba(180,83,9,0.14)",
    badgeText: "#92400E",
    counterText: "#92400E",
    completionOverlay: "rgba(255,255,255,0.44)",
    shimmerStops: ["rgba(180,83,9,0.00)", "rgba(234,179,8,0.20)", "rgba(180,83,9,0.00)"],
  },
  2: {
    cardBackground: "rgba(34,197,94,0.12)",
    borderColor: "#15803D",
    textColor: "#1E293B",
    badgeBackground: "rgba(34,197,94,0.16)",
    badgeText: "#166534",
    counterText: "#166534",
    completionOverlay: "rgba(255,255,255,0.42)",
  },
  3: {
    cardBackground: "rgba(148,163,184,0.16)",
    borderColor: "rgba(71,85,105,0.45)",
    textColor: "#334155",
    badgeBackground: "rgba(148,163,184,0.20)",
    badgeText: "#334155",
    counterText: "#334155",
    completionOverlay: "rgba(255,255,255,0.40)",
  },
};

export function getAdhkarPriorityColors(theme: ResolvedTheme, priority: AdhkarPriority): PriorityColors {
  if (theme === "light") return LIGHT_ADHKAR_PRIORITY_COLORS[priority];
  return DARK_ADHKAR_PRIORITY_COLORS[priority];
}

