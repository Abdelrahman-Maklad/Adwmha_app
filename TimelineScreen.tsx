// TimelineScreen.tsx
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, I18nManager } from "react-native";

import { seedIfEmpty } from "./db/seed";
import { loadCheckpoints } from "./db/queries";

// OPTIONAL: lucide icons (if you already use lucide-react-native)
import {
  Moon,
  Sunrise,
  Sun,
  CloudSun,
  Sunset,
  CloudMoon,
  Star,
  BookOpen,
  Users,
  Clock,
  Heart,
  Landmark,
} from "lucide-react-native";

const ICON_MAP: Record<string, any> = {
  moon: Moon,
  sunrise: Sunrise,
  sun: Sun,
  cloudsun: CloudSun,
  sunset: Sunset,
  cloudmoon: CloudMoon,
  star: Star,

  book: BookOpen,
  users: Users,
  clock: Clock,
  heart: Heart,
  pray: Landmark, // best close icon in lucide
};

function toArabicDigits(input: string) {
  const map: Record<string, string> = {
    "0": "٠",
    "1": "١",
    "2": "٢",
    "3": "٣",
    "4": "٤",
    "5": "٥",
    "6": "٦",
    "7": "٧",
    "8": "٨",
    "9": "٩",
  };
  return input.replace(/[0-9]/g, (d) => map[d]);
}

// Dummy formatting like the screenshot: "ص ٥:١٠" / "م ٧:٠٥"
function formatTimeLabel(hhmm: string) {
  // if you store "api" sometimes, show a dummy
  if (!hhmm || hhmm === "api") return "ص ٥:٠٠";

  const [hhStr, mmStr] = hhmm.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);

  const isPM = hh >= 12;
  const period = isPM ? "م" : "ص";

  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;

  const label = `${period} ${h12}:${String(mm).padStart(2, "0")}`;
  return toArabicDigits(label);
}

export default function TimelineScreen() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // ✅ dummy times for now
        const times = {
          fajr: "05:01",
          sunrise: "06:28",
          dhuhr: "12:03",
          asr: "15:24",
          maghrib: "17:56",
          isha: "19:25",
        };
        const lastThirdTime = "03:30";

        await seedIfEmpty(times, lastThirdTime);
        const data = await loadCheckpoints();
        setCheckpoints(data);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  if (err) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>❌ Error</Text>
        <Text style={styles.errText}>{err}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={checkpoints}
        keyExtractor={(cp) => cp.id}
        contentContainerStyle={{ paddingVertical: 18 }}
        renderItem={({ item: cp, index }) => {
          const CpIcon = ICON_MAP[String(cp.icon || "").toLowerCase()];
          return (
            <View style={styles.checkpointRow}>
              {/* Timeline column */}
              <View style={styles.timelineCol}>
                <View style={styles.dot} />
                <View style={styles.line} />
              </View>

              {/* Content column */}
              <View style={styles.contentCol}>
                {/* Header pill */}
                <View style={[styles.headerPill, { borderColor: cp.color || "rgba(255,255,255,0.10)" }]}>
                  <View style={styles.headerInner}>
                    {/* icon */}
                    <View style={styles.headerIcon}>
                      {CpIcon ? <CpIcon size={16} color={cp.color || "#7B6CF6"} /> : null}
                    </View>

                    {/* name */}
                    <Text style={[styles.headerName, { color: cp.color || "#7B6CF6" }]} numberOfLines={1}>
                      {cp.name}
                    </Text>

                    {/* time */}
                    <View style={styles.timePill}>
                      <Text style={styles.timeText}>{formatTimeLabel(cp.time)}</Text>
                    </View>
                  </View>
                </View>

                {/* Tasks */}
                {(cp.tasks ?? []).map((t: any) => {
                  const TaskIcon = ICON_MAP[String(t.icon || "").toLowerCase()];
                  const isMain = t.type === "main_task";
                  return (
                    <Pressable key={t.id} style={styles.taskCard}>
                      {/* radio circle (right side) */}
                      <View style={styles.radioOuter} />

                      {/* content row */}
                      <View style={styles.taskContentRow}>
                        <View style={styles.taskIcon}>
                          {TaskIcon ? <TaskIcon size={16} color={isMain ? (cp.color || "#7B6CF6") : "#9CA3AF"} /> : null}
                        </View>

                        <Text
                          style={[
                            styles.taskText,
                            { color: isMain ? (cp.color || "#7B6CF6") : "#CBD5E1" },
                          ]}
                          numberOfLines={1}
                        >
                          {t.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E1A",
    paddingHorizontal: 14,
  },
  title: { color: "white", fontSize: 18, marginTop: 16 },
  errText: { color: "#FCA5A5", marginTop: 10 },

  checkpointRow: {
    flexDirection: "row-reverse", // RTL layout
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 18,
  },

  timelineCol: {
    width: 22,
    alignItems: "center",
    paddingTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
  },
  line: {
    marginTop: 6,
    width: 3,
    flex: 1,
    borderRadius: 3,
    backgroundColor: "rgba(59,130,246,0.75)",
  },

  contentCol: {
    flex: 1,
    gap: 10,
  },

  headerPill: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  headerInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: { width: 18, alignItems: "center" },
  headerName: { fontSize: 14, fontWeight: "700" },

  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  timeText: {
    color: "#E5E7EB",
    fontSize: 12,
  },

  taskCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
  },
  taskContentRow: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  taskIcon: { width: 18, alignItems: "center" },
  taskText: {
    flex: 1,
    fontSize: 14,
  },
});