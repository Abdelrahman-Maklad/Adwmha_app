import { AdhkarPriority } from "../db/adhkarTypes";

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

export const ADHKAR_PRIORITY_COLORS: Record<AdhkarPriority, PriorityColors> = {
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
