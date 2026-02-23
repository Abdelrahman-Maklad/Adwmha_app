import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
  Image,
  ImageBackground,
  useColorScheme,
  Modal,
  Switch,
  Alert,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";

import { seedIfEmpty } from "./db/seed";
import { loadCheckpoints, updateTaskNotificationSettings } from "./db/queries";
import { loadCompletionState, saveCompletionState } from "./db/progress";
import { initializePrayerTimes, DateInfo } from "./services/prayerTimes";
import { formatHijriDate, formatGregorianDate, toArabicDigits } from "./utils/dateFormat";
import {
  cancelTaskNotifications,
  scheduleTaskNotifications,
} from "./services/taskNotifications";
import StartScreen from "./StartScreen";

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
  Calendar,
  MapPin,
  MoreVertical,
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
  }, [expanded, animHeight]);

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

function AnimatedChevron({ expanded, color }: { expanded: boolean; color: string }) {
  const rotation = useRef(new Animated.Value(expanded ? 0 : -90)).current;

  useEffect(() => {
    Animated.timing(rotation, {
      toValue: expanded ? 0 : -90,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotation]);

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

function CalendarHeader({
  dateInfo,
  locationLabel,
  totalPoints,
}: {
  dateInfo: DateInfo | null;
  locationLabel: string;
  totalPoints: number;
}) {
  return (
    <View style={styles.calendarHeader}>
      <View style={styles.headerMetaRow}>
        <View style={styles.locationPill}>
          <MapPin size={14} color="#A5B4FC" />
          <Text style={styles.locationText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>

        <View style={styles.pointsCounter}>
          <Text style={styles.pointsCounterLabel}>نقاط اليوم</Text>
          <Text style={styles.pointsCounterValue}>{toArabicDigits(totalPoints)}</Text>
        </View>
      </View>

      <View style={styles.hijriContainer}>
        <Calendar size={20} color="#7B6CF6" />
        <Text style={styles.hijriDate}>{dateInfo ? formatHijriDate(dateInfo.hijri) : "???? ???????..."}</Text>
      </View>

      <Text style={styles.gregorianDate}>{dateInfo ? formatGregorianDate(dateInfo.gregorian) : ""}</Text>
    </View>
  );
}

function formatTimeLabel(hhmm: string) {
  if (!hhmm || hhmm === "api") return toArabicDigits("? 5:00");

  const [hhStr, mmStr] = hhmm.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);

  const isPM = hh >= 12;
  const period = isPM ? "م" : "ص";

  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;

  const label = ` ${h12}:${String(mm).padStart(2, "0")} ${period}`;
  return toArabicDigits(label);
}

function parseHHmmToDate(hhmm: string): Date {
  const now = new Date();
  const [hhStr, mmStr] = String(hhmm || "").split(":");
  const hour = Number(hhStr);
  const minute = Number(mmStr);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return now;

  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function toHHmm(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}`;
}

export default function TimelineScreen() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [locationLabel, setLocationLabel] = useState("?????? ??? ????");

  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [doneState, setDoneState] = useState<Record<string, boolean>>({});
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedTaskNotification, setSelectedTaskNotification] = useState<{
    checkpointId: string;
    checkpointName: string;
    taskId: string;
    taskName: string;
    repeat: string;
    repeatDays: unknown;
  } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);

  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const result = await initializePrayerTimes();
        setDateInfo(result.date);
        setLocationLabel(result.locationLabel);

        await seedIfEmpty(result.times, result.lastThirdTime);

        const [data, persistedDoneState] = await Promise.all([
          loadCheckpoints(),
          loadCompletionState(),
        ]);

        setCheckpoints(data);
        setDoneState(persistedDoneState);
        setExpandedCheckpoints(new Set(data.map((cp: any) => cp.id)));
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPoints = useMemo(() => {
    let total = 0;

    checkpoints.forEach((cp: any) => {
      (cp.tasks ?? []).forEach((task: any) => {
        const taskDone = doneState[task.id] ?? task.done ?? false;
        if (taskDone && Number(task.points) > 0) {
          total += Number(task.points);
        }

        (task.checklist ?? []).forEach((item: any) => {
          const itemDone = doneState[item.id] ?? item.done ?? false;
          if (itemDone && Number(item.points) > 0) {
            total += Number(item.points);
          }
        });
      });
    });

    return total;
  }, [checkpoints, doneState]);

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

  const toggleItemDone = async (itemId: string) => {
    const nextDone = !(doneState[itemId] ?? false);

    setDoneState((prev) => ({
      ...prev,
      [itemId]: nextDone,
    }));

    try {
      await saveCompletionState(itemId, nextDone);
    } catch (e) {
      console.error("Failed to persist completion state:", e);
    }
  };

  const openTaskNotificationMenu = (cp: any, task: any) => {
    setSelectedTaskNotification({
      checkpointId: cp.id,
      checkpointName: cp.name,
      taskId: task.id,
      taskName: task.name,
      repeat: task.repeat ?? "daily",
      repeatDays: task.repeat_days ?? "",
    });
    setNotificationsEnabled(Boolean(task.notifications));
    setNotificationTime(parseHHmmToDate(task.notification_time || cp.time || "08:00"));
    setNotificationModalVisible(true);
  };

  const onTimeChanged = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setNotificationTime(selected);
    setShowTimePicker(false);
  };

  const saveTaskNotification = async () => {
    if (!selectedTaskNotification) return;

    const notificationTimeHHmm = toHHmm(notificationTime);

    try {
      setSavingNotificationSettings(true);

      const updated = await updateTaskNotificationSettings({
        taskId: selectedTaskNotification.taskId,
        notifications: notificationsEnabled,
        notificationTime: notificationTimeHHmm,
      });

      if (!updated) {
        Alert.alert("خطأ", "تعذر تحديث إعدادات التنبيه للمهمة.");
        return;
      }

      setCheckpoints((prev) =>
        prev.map((cp: any) => (cp.id === updated.checkpoint.id ? updated.checkpoint : cp))
      );

      if (notificationsEnabled) {
        const scheduled = await scheduleTaskNotifications({
          taskId: selectedTaskNotification.taskId,
          taskName: selectedTaskNotification.taskName,
          checkpointName: selectedTaskNotification.checkpointName,
          repeat: selectedTaskNotification.repeat,
          repeatDays: selectedTaskNotification.repeatDays,
          notificationTime: notificationTimeHHmm,
        });

        if (!scheduled) {
          Alert.alert("تنبيه", "تم الحفظ لكن تعذر جدولة الإشعار. تحقق من الصلاحيات والوقت.");
        }
      } else {
        await cancelTaskNotifications(selectedTaskNotification.taskId);
      }

      setNotificationModalVisible(false);
      setSelectedTaskNotification(null);
    } catch (e) {
      console.error("Failed to save task notification settings:", e);
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ إعدادات التنبيه.");
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  if (err) {
    return (
      <View style={styles.screen}>
        <Text style={styles.title}>Error</Text>
        <Text style={styles.errText}>{err}</Text>
      </View>
    );
  }

  if (loading) {
    return <StartScreen />;
  }

  return (
    <ImageBackground
      source={require("./assets/islamic ornament background.png")}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay} />
      <FlatList
        data={checkpoints}
        keyExtractor={(cp) => cp.id}
        contentContainerStyle={{ paddingVertical: 18, paddingHorizontal: 14 }}
        ListHeaderComponent={
          <View>
            <View style={styles.logoWrap}>
              <Image
                source={
                  isDark
                    ? require("./assets/logo-white.png")
                    : require("./assets/logo-gradient.png")
                }
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <CalendarHeader
              dateInfo={dateInfo}
              locationLabel={locationLabel}
              totalPoints={totalPoints}
            />
          </View>
        }
        renderItem={({ item: cp }) => {
          const CpIcon = ICON_MAP[String(cp.icon || "").toLowerCase()];
          const color = cp.color || "#7B6CF6";
          const isCheckpointExpanded = expandedCheckpoints.has(cp.id);
          const tasks = cp.tasks ?? [];

          return (
            <View style={styles.checkpointRow}>
              <View style={styles.timelineCol}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={[styles.line, { backgroundColor: withAlpha(color, 0.6) }]} />
              </View>

              <View style={styles.contentCol}>
                <Pressable
                  style={[
                    styles.headerPill,
                    {
                      borderColor: "rgba(255,255,255,0.15)",
                      backgroundColor: "rgba(255,255,255,0.04)",
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

                    <View style={styles.timePill}>
                      <Text style={[styles.timeText, { color }]}>{formatTimeLabel(cp.time)}</Text>
                    </View>
                  </View>
                </Pressable>

                <Accordion expanded={isCheckpointExpanded}>
                  <View style={styles.tasksContainer}>
                    {tasks.map((t: any) => {
                      const TaskIcon = ICON_MAP[String(t.icon || "").toLowerCase()];
                      const isMain = t.type === "main_task";
                      const taskColor = isMain ? color : "#9CA3AF";
                      const taskDone = doneState[t.id] ?? t.done ?? false;
                      const hasChecklist = (t.checklist ?? []).length > 0;
                      const isTaskExpanded = expandedTasks.has(`${cp.id}_${t.id}`);

                      return (
                        <View key={t.id} style={styles.taskWrapper}>
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
                            onPress={() => {
                              void toggleItemDone(t.id);
                              if (hasChecklist) toggleTask(cp.id, t.id);
                            }}
                          >
                            <View
                              style={[
                                styles.checkboxOuter,
                                taskDone && {
                                  backgroundColor: color,
                                  borderColor: color,
                                },
                              ]}
                            >
                              {taskDone && <Check size={12} color="#0A0E1A" strokeWidth={3} />}
                            </View>

                            <View style={styles.taskContentContainer}>
                              {TaskIcon && (
                                <TaskIcon
                                  size={16}
                                  color={taskDone ? darkenColor(color, 20) : taskColor}
                                />
                              )}
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
                            </View>

                            {hasChecklist && (
                              <AnimatedChevron expanded={isTaskExpanded} color={taskColor} />
                            )}

                            {t.enable_disable_notifications && (
                              <Pressable
                                style={styles.taskMenuButton}
                                onPress={(event) => {
                                  event.stopPropagation();
                                  openTaskNotificationMenu(cp, t);
                                }}
                              >
                                <MoreVertical size={16} color="#E5E7EB" />
                              </Pressable>
                            )}
                          </Pressable>

                          {hasChecklist && (
                            <Accordion expanded={isTaskExpanded}>
                              <View style={styles.checklistContainer}>
                                {(t.checklist ?? []).map((item: any) => {
                                  const ItemIcon = ICON_MAP[String(item.icon || "").toLowerCase()];
                                  const itemDone = doneState[item.id] ?? item.done ?? false;

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
                                      onPress={() => void toggleItemDone(item.id)}
                                    >
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

                                      {ItemIcon && (
                                        <ItemIcon
                                          size={14}
                                          color={itemDone ? darkenColor(color, 20) : "#9CA3AF"}
                                        />
                                      )}

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

                                      {item.points > 0 && (
                                        <View
                                          style={[
                                            styles.pointsBadge,
                                            { backgroundColor: withAlpha(color, 0.2) },
                                          ]}
                                        >
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

      <Modal
        visible={notificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>إعدادات التنبيه</Text>
            <Text style={styles.modalTaskName} numberOfLines={2}>
              {selectedTaskNotification?.taskName ?? ""}
            </Text>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>تفعيل التنبيه</Text>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </View>

            <View style={styles.modalRow}>
              <Text style={styles.modalLabel}>وقت التنبيه</Text>
              <Pressable
                style={styles.timeSelectButton}
                onPress={() => setShowTimePicker(true)}
                disabled={!notificationsEnabled}
              >
                <Text style={styles.timeSelectText}>{toArabicDigits(toHHmm(notificationTime))}</Text>
              </Pressable>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={notificationTime}
                mode="time"
                display="default"
                onChange={onTimeChanged}
              />
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => {
                  setNotificationModalVisible(false);
                  setSelectedTaskNotification(null);
                }}
              >
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalSave,
                  savingNotificationSettings && { opacity: 0.65 },
                ]}
                onPress={() => void saveTaskNotification()}
                disabled={savingNotificationSettings}
              >
                <Text style={styles.modalSaveText}>حفظ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,26,0.88)",
  },
  title: { color: "white", fontSize: 18, marginTop: 16 },
  errText: { color: "#FCA5A5", marginTop: 10 },

  logoWrap: {
    alignItems: "center",
    marginBottom: 6,
  },
  logo: {
    width: 120,
    height: 120,
  },

  calendarHeader: {
    alignItems: "center",
    paddingVertical: 18,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerMetaRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  locationPill: {
    flex: 1,
    maxWidth: "75%",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99,102,241,0.16)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  locationText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  pointsCounter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pointsCounterLabel: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "700",
  },
  pointsCounterValue: {
    color: "#ECFDF5",
    fontSize: 13,
    fontWeight: "800",
  },
  hijriContainer: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  hijriDate: {
    color: "#E5E7EB",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  gregorianDate: {
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },

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
    borderWidth: 1,
    borderRadius: 25,
    paddingVertical: 4,
    paddingHorizontal: 4,
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
    borderRadius: 25,
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
  taskContentContainer: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  taskText: {
    fontSize: 14,
    fontWeight: "500",
  },
  taskMenuButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
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
    borderRadius: 20,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#111827",
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    color: "#F9FAFB",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "right",
  },
  modalTaskName: {
    color: "#D1D5DB",
    fontSize: 14,
    textAlign: "right",
  },
  modalRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalLabel: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  timeSelectButton: {
    minWidth: 98,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  timeSelectText: {
    color: "#F3F4F6",
    fontSize: 14,
    fontWeight: "700",
  },
  modalActions: {
    marginTop: 6,
    flexDirection: "row-reverse",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCancel: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "transparent",
  },
  modalSave: {
    backgroundColor: "#4F46E5",
  },
  modalCancelText: {
    color: "#E5E7EB",
    fontWeight: "600",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
