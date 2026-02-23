// TimelineScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from "react-native";

import { seedIfEmpty } from "./db/seed";
import { loadCheckpoints } from "./db/queries";

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
  ChevronDown,
  Check,
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
  pray: Landmark,
};

// ============ COLOR UTILITIES ============

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0"))
      .join("")
  );
}

function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amt = Math.round(2.55 * percent);
  return rgbToHex(rgb.r + amt, rgb.g + amt, rgb.b + amt);
}

function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amt = Math.round(2.55 * percent);
  return rgbToHex(rgb.r - amt, rgb.g - amt, rgb.b - amt);
}

function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(255,255,255,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

// ============ ACCORDION COMPONENT ============

function Accordion({
  expanded,
  children,
}: {
  expanded: boolean;
  children: React.ReactNode;
}) {
  const [contentHeight, setContentHeight] = useState(0);
  const animHeight = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animHeight, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const handleLayout = (e: LayoutChangeEvent) => {
    const height = e.nativeEvent.layout.height;
    if (height > 0 && height !== contentHeight) {
      setContentHeight(height);
    }
  };

  const height = animHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, contentHeight],
  });

  return (
    <Animated.View style={{ height, overflow: "hidden" }}>
      <View style={{ position: "absolute", width: "100%" }} onLayout={handleLayout}>
        {children}
      </View>
    </Animated.View>
  );
}

// ============ CHEVRON ICON WITH ROTATION ============

function AnimatedChevron({ expanded, color }: { expanded: boolean; color: string }) {
  const rotation = useRef(new Animated.Value(expanded ? 0 : -90)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 0 : -90,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded]);

  const rotate = rotation.interpolate({
    inputRange: [-90, 0],
    outputRange: ["-90deg", "0deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <ChevronDown size={16} color={color} />
    </Animated.View>
  );
}

// ============ HELPERS ============

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

function formatTimeLabel(hhmm: string) {
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

// ============ MAIN COMPONENT ============

export default function TimelineScreen() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [err, setErr] = useState("");

  // Expansion state
  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Done state (local only, not persisted)
  const [taskDoneState, setTaskDoneState] = useState<Record<string, boolean>>({});
  const [checklistDoneState, setChecklistDoneState] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
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
        // Initialize all checkpoints as expanded
        setExpandedCheckpoints(new Set(data.map((cp: any) => cp.id)));
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  // Toggle handlers
  const toggleCheckpoint = (checkpointId: string) => {
    setExpandedCheckpoints((prev) => {
      const next = new Set(prev);
      if (next.has(checkpointId)) next.delete(checkpointId);
      else next.add(checkpointId);
      return next;
    });
  };

  const toggleTask = (checkpointId: string, taskId: string) => {
    const key = `${checkpointId}_${taskId}`;
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleTaskDone = (taskId: string) => {
    setTaskDoneState((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleChecklistDone = (itemId: string) => {
    setChecklistDoneState((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (err) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Error</Text>
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
        renderItem={({ item: cp }) => {
          const CpIcon = ICON_MAP[String(cp.icon || "").toLowerCase()];
          const color = cp.color || "#7B6CF6";
          const isCheckpointExpanded = expandedCheckpoints.has(cp.id);
          const tasks = cp.tasks ?? [];

          return (
            <View style={styles.checkpointRow}>
              {/* Timeline column */}
              <View style={styles.timelineCol}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={[styles.line, { backgroundColor: withAlpha(color, 0.6) }]} />
              </View>

              {/* Content column */}
              <View style={styles.contentCol}>
                {/* Header pill - clickable */}
                <Pressable
                  style={[
                    styles.headerPill,
                    {
                      borderColor: withAlpha(color, 0.5),
                      backgroundColor: withAlpha(color, 0.12),
                    },
                  ]}
                  onPress={() => toggleCheckpoint(cp.id)}
                >
                  <View style={styles.headerInner}>
                    <AnimatedChevron expanded={isCheckpointExpanded} color={color} />

                    <View style={styles.headerIcon}>
                      {CpIcon ? <CpIcon size={16} color={color} /> : null}
                    </View>

                    <Text style={[styles.headerName, { color }]} numberOfLines={1}>
                      {cp.name}
                    </Text>

                    <View style={[styles.timePill, { backgroundColor: withAlpha(color, 0.2) }]}>
                      <Text style={[styles.timeText, { color: lightenColor(color, 30) }]}>
                        {formatTimeLabel(cp.time)}
                      </Text>
                    </View>
                  </View>
                </Pressable>

                {/* Tasks - collapsible */}
                <Accordion expanded={isCheckpointExpanded}>
                  <View style={styles.tasksContainer}>
                    {tasks.map((t: any) => {
                      const TaskIcon = ICON_MAP[String(t.icon || "").toLowerCase()];
                      const isMain = t.type === "main_task";
                      const taskColor = isMain ? color : "#9CA3AF";
                      const taskDone = taskDoneState[t.id] ?? t.done ?? false;
                      const hasChecklist = (t.checklist ?? []).length > 0;
                      const isTaskExpanded = expandedTasks.has(`${cp.id}_${t.id}`);

                      return (
                        <View key={t.id} style={styles.taskWrapper}>
                          {/* Task card */}
                          <Pressable
                            style={[
                              styles.taskCard,
                              {
                                backgroundColor: taskDone
                                  ? withAlpha(color, 0.15)
                                  : withAlpha(color, 0.06),
                                borderColor: taskDone
                                  ? withAlpha(color, 0.4)
                                  : withAlpha(color, 0.15),
                              },
                            ]}
                            onPress={() => hasChecklist && toggleTask(cp.id, t.id)}
                          >
                            {/* Checkbox - separate press area */}
                            <Pressable
                              style={[
                                styles.checkboxOuter,
                                taskDone && {
                                  backgroundColor: color,
                                  borderColor: color,
                                },
                              ]}
                              onPress={() => toggleTaskDone(t.id)}
                            >
                              {taskDone && <Check size={12} color="#0A0E1A" strokeWidth={3} />}
                            </Pressable>

                            {/* Content row */}
                            <View style={styles.taskContentRow}>
                              <View style={styles.taskIcon}>
                                {TaskIcon ? (
                                  <TaskIcon
                                    size={16}
                                    color={taskDone ? darkenColor(color, 20) : taskColor}
                                  />
                                ) : null}
                              </View>

                              <Text
                                style={[
                                  styles.taskText,
                                  {
                                    color: taskDone ? darkenColor(color, 10) : taskColor,
                                    textDecorationLine: taskDone ? "line-through" : "none",
                                    opacity: taskDone ? 0.7 : 1,
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {t.name}
                              </Text>

                              {/* Chevron if has checklist */}
                              {hasChecklist && (
                                <AnimatedChevron expanded={isTaskExpanded} color={taskColor} />
                              )}
                            </View>
                          </Pressable>

                          {/* Checklist items - collapsible */}
                          {hasChecklist && (
                            <Accordion expanded={isTaskExpanded}>
                              <View style={styles.checklistContainer}>
                                {(t.checklist ?? []).map((item: any) => {
                                  const ItemIcon = ICON_MAP[String(item.icon || "").toLowerCase()];
                                  const itemDone = checklistDoneState[item.id] ?? item.done ?? false;

                                  return (
                                    <Pressable
                                      key={item.id}
                                      style={[
                                        styles.checklistItem,
                                        {
                                          backgroundColor: itemDone
                                            ? withAlpha(color, 0.1)
                                            : "rgba(255,255,255,0.02)",
                                          borderColor: itemDone
                                            ? withAlpha(color, 0.3)
                                            : "rgba(255,255,255,0.06)",
                                        },
                                      ]}
                                      onPress={() => toggleChecklistDone(item.id)}
                                    >
                                      {/* Checkbox */}
                                      <View
                                        style={[
                                          styles.checkboxSmall,
                                          itemDone && {
                                            backgroundColor: color,
                                            borderColor: color,
                                          },
                                        ]}
                                      >
                                        {itemDone && (
                                          <Check size={10} color="#0A0E1A" strokeWidth={3} />
                                        )}
                                      </View>

                                      {/* Icon */}
                                      {ItemIcon && (
                                        <ItemIcon
                                          size={14}
                                          color={itemDone ? darkenColor(color, 20) : "#9CA3AF"}
                                        />
                                      )}

                                      {/* Name */}
                                      <Text
                                        style={[
                                          styles.checklistText,
                                          {
                                            color: itemDone ? darkenColor(color, 10) : "#CBD5E1",
                                            textDecorationLine: itemDone
                                              ? "line-through"
                                              : "none",
                                            opacity: itemDone ? 0.7 : 1,
                                          },
                                        ]}
                                        numberOfLines={1}
                                      >
                                        {item.name}
                                      </Text>

                                      {/* Points badge */}
                                      {item.points > 0 && (
                                        <View style={[styles.pointsBadge, { backgroundColor: withAlpha(color, 0.2) }]}>
                                          <Text style={[styles.pointsText, { color }]}>
                                            +{item.points}
                                          </Text>
                                        </View>
                                      )}
                                    </Pressable>
                                  );
                                })}
                              </View>
                            </Accordion>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </Accordion>
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
    flexDirection: "row-reverse",
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
    width: 12,
    height: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  line: {
    marginTop: 6,
    width: 3,
    flex: 1,
    borderRadius: 3,
  },

  contentCol: {
    flex: 1,
    gap: 10,
  },

  headerPill: {
    alignSelf: "flex-end",
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: { width: 18, alignItems: "center" },
  headerName: { fontSize: 14, fontWeight: "700" },

  timePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  tasksContainer: {
    gap: 8,
    paddingTop: 6,
  },

  taskWrapper: {
    gap: 4,
  },

  taskCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "500",
  },

  checklistContainer: {
    marginTop: 4,
    marginRight: 12,
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  checklistItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkboxSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checklistText: {
    flex: 1,
    fontSize: 13,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: "700",
  },
});