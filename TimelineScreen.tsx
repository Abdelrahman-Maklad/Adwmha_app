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
  TextInput,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Audio } from "expo-av";

import { seedIfEmpty } from "./db/seed";
import {
  loadCheckpoints,
  updateCheckpointNotificationSettings,
  updateTaskNotificationSettings,
} from "./db/queries";
import { loadCompletionStateByDay, saveCompletionStateByDay } from "./db/progress";
import {
  initializePrayerTimes,
  DateInfo,
  fetchHijriMonthCalendar,
  HijriMonthDayCard,
  PrayerTimes,
  fetchPrayerTimesForDate,
} from "./services/prayerTimes";
import { formatHijriDate, formatGregorianDate, toArabicDigits } from "./utils/dateFormat";
import {
  cancelCheckpointNotifications,
  cancelTaskNotifications,
  scheduleCheckpointNotifications,
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
  Bell,
  BellOff,
  Play,
  Square,
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
  isDark,
  onReturnToToday,
}: {
  dateInfo: DateInfo | null;
  locationLabel: string;
  totalPoints: number;
  isDark: boolean;
  onReturnToToday: () => void;
}) {
  return (
    <View style={styles.calendarHeader}>
      <View style={styles.topRow}>
        <View style={styles.topRowRight}>
          <Image
            source={
              isDark ? require("./assets/logo-white.png") : require("./assets/logo-gradient.png")
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topRowLeft}>
          <View style={styles.locationPill}>
            <MapPin size={14} color="#A5B4FC" />
            <Text style={styles.locationText} numberOfLines={1}>
              {locationLabel}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.secondRow}>
        <View style={styles.dateCluster}>
          <Text style={styles.hijriDate}>{dateInfo ? formatHijriDate(dateInfo.hijri) : "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644..."}</Text>
          <Text style={styles.gregorianDate}>{dateInfo ? formatGregorianDate(dateInfo.gregorian) : ""}</Text>
        </View>

        <View style={styles.pointsCounter}>
          <Text style={styles.pointsCounterLabel}>نقاط اليوم</Text>
          <Text style={styles.pointsCounterValue}>{toArabicDigits(totalPoints)}</Text>
        </View>

        <Pressable style={styles.calendarIconWrap} onPress={onReturnToToday}>
          <Calendar size={20} color="#7B6CF6" />
        </Pressable>
      </View>
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

function gregorianDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toGregorianMonthAr(monthEn: string): string {
  const map: Record<string, string> = {
    January: "\u064A\u0646\u0627\u064A\u0631",
    February: "\u0641\u0628\u0631\u0627\u064A\u0631",
    March: "\u0645\u0627\u0631\u0633",
    April: "\u0623\u0628\u0631\u064A\u0644",
    May: "\u0645\u0627\u064A\u0648",
    June: "\u064A\u0648\u0646\u064A\u0648",
    July: "\u064A\u0648\u0644\u064A\u0648",
    August: "\u0623\u063A\u0633\u0637\u0633",
    September: "\u0633\u0628\u062A\u0645\u0628\u0631",
    October: "\u0623\u0643\u062A\u0648\u0628\u0631",
    November: "\u0646\u0648\u0641\u0645\u0628\u0631",
    December: "\u062F\u064A\u0633\u0645\u0628\u0631",
  };

  return map[monthEn] ?? monthEn;
}

function normalizeDayWithoutLeadingZero(day: string): string {
  const numeric = Number(day);
  if (Number.isFinite(numeric)) return String(numeric);
  const normalized = String(day).replace(/^0+/, "");
  return normalized || "0";
}

function parseMinutes(hhmm: string): number {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function formatMinutes(total: number): string {
  const normalized = ((Math.floor(total) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateLastThirdFromTimes(isha: string, fajr: string): string {
  const ishaMinutes = parseMinutes(isha);
  const fajrMinutes = parseMinutes(fajr);
  const nightDuration =
    fajrMinutes > ishaMinutes ? fajrMinutes - ishaMinutes : 24 * 60 - ishaMinutes + fajrMinutes;
  return formatMinutes(ishaMinutes + (2 * nightDuration) / 3);
}

const SOUND_OPTIONS = ["default", "adhan"];
const PREVIEWABLE_SOUND_ASSETS: Record<string, any> = {
  "adhan": require("./assets/sounds/adhan.mp3"),
};

export default function TimelineScreen() {
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [monthDayCards, setMonthDayCards] = useState<HijriMonthDayCard[]>([]);
  const [selectedGregorianDayKey, setSelectedGregorianDayKey] = useState("");
  const [todayGregorianDayKey, setTodayGregorianDayKey] = useState("");
  const [locationLabel, setLocationLabel] = useState("الموقع غير متاح");
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [selectedDayTimes, setSelectedDayTimes] = useState<PrayerTimes | null>(null);

  const [expandedCheckpoints, setExpandedCheckpoints] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [doneState, setDoneState] = useState<Record<string, boolean>>({});
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [selectedNotificationTarget, setSelectedNotificationTarget] = useState<{
    type: "task" | "checkpoint";
    checkpointId: string;
    checkpointName: string;
    itemId: string;
    itemName: string;
    repeat: string;
    repeatDays: unknown;
  } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationText, setNotificationText] = useState("");
  const [notificationSound, setNotificationSound] = useState("default");
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const soundPreviewInstance = useRef<Audio.Sound | null>(null);
  const dayCardsListRef = useRef<FlatList<HijriMonthDayCard> | null>(null);
  const pendingDayScrollIndexRef = useRef<number | null>(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme !== "light";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const todayKey = gregorianDayKey(new Date());
        setTodayGregorianDayKey(todayKey);

        const result = await initializePrayerTimes();
        setDateInfo(result.date);
        setLocationLabel(result.locationLabel);
        setLocationCoords(result.location);
        setSelectedDayTimes(result.times);

        await seedIfEmpty(result.times, result.lastThirdTime);
        const data = await loadCheckpoints();

        let cards: HijriMonthDayCard[] = [];
        if (result.location) {
          cards = await fetchHijriMonthCalendar(
            new Date(),
            result.location.latitude,
            result.location.longitude
          );
        }

        if (cards.length === 0) {
          const fallbackDate = new Date();
          const fallbackGregorianDay = result.date?.gregorian.day ?? String(fallbackDate.getDate());
          const fallbackGregorianMonth =
            result.date?.gregorian.month ??
            fallbackDate.toLocaleString("en-US", { month: "long" });

          cards = [
            {
              hijriDay: result.date?.hijri.day ?? "1",
              hijriMonthAr: result.date?.hijri.monthAr ?? "",
              hijriYear: result.date?.hijri.year ?? "",
              weekdayAr: result.date?.hijri.weekdayAr ?? "",
              gregorianKey: todayKey,
              gregorianDay: fallbackGregorianDay,
              gregorianMonthAr: toGregorianMonthAr(fallbackGregorianMonth),
              isToday: true,
            },
          ];
        }

        const initialSelectedKey =
          cards.find((day) => day.isToday)?.gregorianKey ?? cards[0]?.gregorianKey ?? todayKey;
        const persistedDoneState = await loadCompletionStateByDay(initialSelectedKey);

        setCheckpoints(data);
        setMonthDayCards(cards);
        setSelectedGregorianDayKey(initialSelectedKey);
        setDoneState(persistedDoneState);
        setExpandedCheckpoints(new Set(data.map((cp: any) => cp.id)));
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedGregorianDayKey) return;
    (async () => {
      const state = await loadCompletionStateByDay(selectedGregorianDayKey);
      setDoneState(state);
    })();
  }, [selectedGregorianDayKey]);

  useEffect(() => {
    if (!selectedGregorianDayKey || !locationCoords) return;
    let active = true;

    (async () => {
      const times = await fetchPrayerTimesForDate(
        locationCoords.latitude,
        locationCoords.longitude,
        selectedGregorianDayKey
      );
      if (!active || !times) return;
      setSelectedDayTimes(times);
    })();

    return () => {
      active = false;
    };
  }, [selectedGregorianDayKey, locationCoords]);

  useEffect(() => {
    return () => {
      const current = soundPreviewInstance.current;
      if (!current) return;
      void current.stopAsync().catch(() => {});
      void current.unloadAsync().catch(() => {});
      soundPreviewInstance.current = null;
    };
  }, []);

  const totalPoints = useMemo(() => {
    let total = 0;

    checkpoints.forEach((cp: any) => {
      (cp.tasks ?? []).forEach((task: any) => {
        const taskDone = Boolean(doneState[task.id]);
        if (taskDone && Number(task.points) > 0) {
          total += Number(task.points);
        }

        (task.checklist ?? []).forEach((item: any) => {
          const itemDone = Boolean(doneState[item.id]);
          if (itemDone && Number(item.points) > 0) {
            total += Number(item.points);
          }
        });
      });
    });

    return total;
  }, [checkpoints, doneState]);

  const checkpointsForSelectedDay = useMemo(() => {
    if (!selectedDayTimes) return checkpoints;

    const timeByCheckpointId: Record<string, string> = {
      cp_fajr: selectedDayTimes.fajr,
      cp_sunrise: selectedDayTimes.sunrise,
      cp_dhuhr: selectedDayTimes.dhuhr,
      cp_asr: selectedDayTimes.asr,
      cp_maghrib: selectedDayTimes.maghrib,
      cp_isha: selectedDayTimes.isha,
      cp_lastthird: calculateLastThirdFromTimes(selectedDayTimes.isha, selectedDayTimes.fajr),
    };

    return checkpoints.map((cp: any) => {
      const nextTime = timeByCheckpointId[cp.id];
      if (!nextTime) return cp;
      return { ...cp, time: nextTime };
    });
  }, [checkpoints, selectedDayTimes]);

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
    if (!selectedGregorianDayKey) return;
    const nextDone = !(doneState[itemId] ?? false);

    setDoneState((prev) => ({
      ...prev,
      [itemId]: nextDone,
    }));

    try {
      await saveCompletionStateByDay(selectedGregorianDayKey, itemId, nextDone);
    } catch (e) {
      console.error("Failed to persist completion state:", e);
    }
  };

  const handleSelectDay = (dayKey: string) => {
    setSelectedGregorianDayKey(dayKey);
  };

  const handleReturnToToday = () => {
    if (!todayGregorianDayKey) return;
    setSelectedGregorianDayKey(todayGregorianDayKey);
    const index = monthDayCards.findIndex((day) => day.gregorianKey === todayGregorianDayKey);
    if (index >= 0) {
      pendingDayScrollIndexRef.current = index;
      dayCardsListRef.current?.scrollToIndex({ index, animated: true });
    }
  };

  const handleDayCardsScrollToIndexFailed = () => {
    const index = pendingDayScrollIndexRef.current;
    if (index == null) return;
    const invertedIndex = monthDayCards.length - 1 - index;
    pendingDayScrollIndexRef.current = invertedIndex;
    if (invertedIndex >= 0) {
      dayCardsListRef.current?.scrollToIndex({ index: invertedIndex, animated: true });
    }
  };

    const openTaskNotificationMenu = (cp: any, task: any) => {
    setSelectedNotificationTarget({
      type: "task",
      checkpointId: cp.id,
      checkpointName: cp.name,
      itemId: task.id,
      itemName: task.name,
      repeat: task.repeat ?? "daily",
      repeatDays: task.repeat_days ?? "",
    });
    setNotificationsEnabled(Boolean(task.notifications));
    setNotificationTime(parseHHmmToDate(task.notification_time || cp.time || "08:00"));
    setNotificationTitle(String(task.notification_title ?? "").trim());
    setNotificationText(String(task.notification_text ?? "").trim());
    setNotificationSound(String(task.notification_sound || "default"));
    setNotificationModalVisible(true);
  };

  const openCheckpointNotificationMenu = (cp: any) => {
    setSelectedNotificationTarget({
      type: "checkpoint",
      checkpointId: cp.id,
      checkpointName: cp.name,
      itemId: cp.id,
      itemName: cp.name,
      repeat: cp.repeat ?? "daily",
      repeatDays: cp.repeat_days ?? "",
    });
    setNotificationsEnabled(Boolean(cp.notifications));
    setNotificationTime(parseHHmmToDate(cp.notification_time || cp.time || "08:00"));
    setNotificationTitle(String(cp.notification_title ?? "").trim());
    setNotificationText(String(cp.notification_text ?? "").trim());
    setNotificationSound(String(cp.notification_sound || "default"));
    setNotificationModalVisible(true);
  };

  const onTimeChanged = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setNotificationTime(selected);
    setShowTimePicker(false);
  };

  const saveNotificationSettings = async () => {
    if (!selectedNotificationTarget) return;

    const notificationTimeHHmm = toHHmm(notificationTime);
    const normalizedTitle = notificationTitle.trim();
    const normalizedText = notificationText.trim();
    const normalizedSound = notificationSound.trim() || "default";

    try {
      await stopSoundPreview();
      setSavingNotificationSettings(true);

      if (selectedNotificationTarget.type === "task") {
        const updated = await updateTaskNotificationSettings({
          taskId: selectedNotificationTarget.itemId,
          notifications: notificationsEnabled,
          notificationTime: notificationTimeHHmm,
          notificationTitle: normalizedTitle,
          notificationText: normalizedText,
          notificationSound: normalizedSound,
        });

        if (!updated) {
          Alert.alert("خطأ", "تعذر تحديث إعدادات تنبيه المهمة.");
          return;
        }

        setCheckpoints((prev) =>
          prev.map((cp: any) => (cp.id === updated.checkpoint.id ? updated.checkpoint : cp))
        );

        if (notificationsEnabled) {
          const scheduled = await scheduleTaskNotifications({
            taskId: selectedNotificationTarget.itemId,
            taskName: selectedNotificationTarget.itemName,
            repeat: selectedNotificationTarget.repeat,
            repeatDays: selectedNotificationTarget.repeatDays,
            notificationTime: notificationTimeHHmm,
            notificationTitle: normalizedTitle,
            notificationText: normalizedText,
            notificationSound: normalizedSound,
          });

          if (!scheduled) {
            Alert.alert("تنبيه", "تم الحفظ ولكن تعذر جدولة إشعار المهمة.");
          }
        } else {
          await cancelTaskNotifications(selectedNotificationTarget.itemId);
        }
      } else {
        const updated = await updateCheckpointNotificationSettings({
          checkpointId: selectedNotificationTarget.checkpointId,
          notifications: notificationsEnabled,
          notificationTime: notificationTimeHHmm,
          notificationTitle: normalizedTitle,
          notificationText: normalizedText,
          notificationSound: normalizedSound,
        });

        if (!updated) {
          Alert.alert("خطأ", "تعذر تحديث إعدادات تنبيه المرحلة.");
          return;
        }

        setCheckpoints((prev) =>
          prev.map((cp: any) => (cp.id === updated.checkpoint.id ? updated.checkpoint : cp))
        );

        if (notificationsEnabled) {
          const scheduled = await scheduleCheckpointNotifications({
            checkpointId: selectedNotificationTarget.checkpointId,
            checkpointName: selectedNotificationTarget.itemName,
            repeat: selectedNotificationTarget.repeat,
            repeatDays: selectedNotificationTarget.repeatDays,
            notificationTime: notificationTimeHHmm,
            notificationTitle: normalizedTitle,
            notificationText: normalizedText,
            notificationSound: normalizedSound,
          });

          if (!scheduled) {
            Alert.alert("تنبيه", "تم الحفظ ولكن تعذر جدولة إشعار المرحلة.");
          }
        } else {
          await cancelCheckpointNotifications(selectedNotificationTarget.checkpointId);
        }
      }

      setNotificationModalVisible(false);
      setSelectedNotificationTarget(null);
    } catch (e) {
      console.error("Failed to save notification settings:", e);
      Alert.alert("خطأ", "حدث خطأ أثناء حفظ إعدادات التنبيه.");
    } finally {
      setSavingNotificationSettings(false);
    }
  };

  const isPreviewableSound = (sound: string) =>
    Boolean(sound) && sound !== "default" && Boolean(PREVIEWABLE_SOUND_ASSETS[sound]);

  const stopSoundPreview = async () => {
    const current = soundPreviewInstance.current;
    if (!current) {
      setPreviewingSound(null);
      return;
    }

    try {
      await current.stopAsync();
    } catch {}
    try {
      await current.unloadAsync();
    } catch {}

    soundPreviewInstance.current = null;
    setPreviewingSound(null);
  };

  const playSoundPreview = async (sound: string) => {
    if (!isPreviewableSound(sound)) {
      Alert.alert("خطأ", "ملف الصوت غير متاح للمعاينة");
      return;
    }

    if (previewingSound === sound) {
      await stopSoundPreview();
      return;
    }

    try {
      await stopSoundPreview();

      const { sound: instance } = await Audio.Sound.createAsync(
        PREVIEWABLE_SOUND_ASSETS[sound],
        { shouldPlay: true }
      );

      soundPreviewInstance.current = instance;
      setPreviewingSound(sound);

      instance.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          void stopSoundPreview();
        }
      });
    } catch (e) {
      console.error("Sound preview failed:", e);
      await stopSoundPreview();
      Alert.alert("خطأ", "تعذر تشغيل معاينة الصوت");
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
      <View style={styles.fixedTopBarContainer}>
        <CalendarHeader
          dateInfo={dateInfo}
          locationLabel={locationLabel}
          totalPoints={totalPoints}
          isDark={isDark}
          onReturnToToday={handleReturnToToday}
        />
        <FlatList
          ref={dayCardsListRef}
          data={monthDayCards}
          horizontal
          inverted
          showsHorizontalScrollIndicator={false}
          keyExtractor={(day) => day.gregorianKey}
          onScrollToIndexFailed={handleDayCardsScrollToIndexFailed}
          contentContainerStyle={styles.dayCardsContainer}
          renderItem={({ item: day }) => {
            const selected = day.gregorianKey === selectedGregorianDayKey;
            return (
              <Pressable
                style={[
                  styles.dayCard,
                  selected && styles.dayCardSelected,
                  day.isToday && styles.dayCardToday,
                ]}
                onPress={() => handleSelectDay(day.gregorianKey)}
              >
                <Text style={[styles.dayCardWeekday, selected && styles.dayCardWeekdaySelected]}>
                  {day.weekdayAr}
                </Text>
                <Text style={[styles.dayCardDay, selected && styles.dayCardDaySelected]}>
                  {toArabicDigits(day.hijriDay)}
                </Text>
                <Text
                  style={[
                    styles.dayCardGregorianSmall,
                    selected && styles.dayCardGregorianSmallSelected,
                  ]}
                >
                  {`${toArabicDigits(normalizeDayWithoutLeadingZero(day.gregorianDay))} ${day.gregorianMonthAr}`}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={checkpointsForSelectedDay}
        keyExtractor={(cp) => cp.id}
        contentContainerStyle={{ paddingVertical: 18, paddingHorizontal: 14 }}
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

                    {cp.enable_disable_notifications && (
                      <Pressable
                        style={styles.taskMenuButton}
                        onPress={(event) => {
                          event.stopPropagation();
                          openCheckpointNotificationMenu(cp);
                        }}
                      >
                        {cp.notifications ? (
                          <Bell size={16} color="#E5E7EB" />
                        ) : (
                          <BellOff size={16} color="#E5E7EB" />
                        )}
                      </Pressable>
                    )}
                  </View>
                </Pressable>

                <Accordion expanded={isCheckpointExpanded}>
                  <View style={styles.tasksContainer}>
                    {tasks.map((t: any) => {
                      const TaskIcon = ICON_MAP[String(t.icon || "").toLowerCase()];
                      const isMain = t.type === "main_task";
                      const taskColor = isMain ? color : "#9CA3AF";
                      const taskDone = Boolean(doneState[t.id]);
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
                                {t.notifications ? (
                                  <Bell size={16} color="#E5E7EB" />
                                ) : (
                                  <BellOff size={16} color="#E5E7EB" />
                                )}
                              </Pressable>
                            )}
                          </Pressable>

                          {hasChecklist && (
                            <Accordion expanded={isTaskExpanded}>
                              <View style={styles.checklistContainer}>
                                {(t.checklist ?? []).map((item: any) => {
                                  const ItemIcon = ICON_MAP[String(item.icon || "").toLowerCase()];
                                  const itemDone = Boolean(doneState[item.id]);

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
              {selectedNotificationTarget?.itemName ?? ""}
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

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>عنوان التنبيه</Text>
              <TextInput
                style={styles.modalInput}
                value={notificationTitle}
                onChangeText={setNotificationTitle}
                placeholder="تذكير: اسم المهمة"
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>نص التنبيه</Text>
              <TextInput
                style={[styles.modalInput, styles.modalInputMultiline]}
                value={notificationText}
                onChangeText={setNotificationText}
                placeholder="حان وقت ..."
                placeholderTextColor="#94A3B8"
                textAlign="right"
                multiline
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>صوت التنبيه</Text>
              <View style={styles.soundOptionsRow}>
                {SOUND_OPTIONS.map((option) => (
                  <View key={option} style={styles.soundOptionGroup}>
                    <Pressable
                      style={[
                        styles.soundOptionButton,
                        notificationSound === option && styles.soundOptionButtonActive,
                      ]}
                      onPress={() => setNotificationSound(option)}
                    >
                      <Text style={styles.soundOptionText}>
                        {option === "default" ? "الصوت الافتراضي" : option}
                      </Text>
                    </Pressable>
                    {isPreviewableSound(option) && (
                      <Pressable
                        style={styles.soundPreviewButton}
                        onPress={() => void playSoundPreview(option)}
                      >
                        {previewingSound === option ? (
                          <Square size={14} color="#E5E7EB" />
                        ) : (
                          <Play size={14} color="#E5E7EB" />
                        )}
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
              <TextInput
                style={styles.modalInput}
                value={notificationSound}
                onChangeText={setNotificationSound}
                placeholder="default أو adhan.wav"
                placeholderTextColor="#94A3B8"
                textAlign="right"
              />
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
                  void stopSoundPreview();
                  setNotificationModalVisible(false);
                  setSelectedNotificationTarget(null);
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
                onPress={() => void saveNotificationSettings()}
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

  fixedTopBarContainer: {
    paddingTop: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
    backgroundColor: "rgba(10,14,26,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  logo: {
    width: 86,
    height: 86,
  },
  dayCardsContainer: {
    paddingBottom: 6,
    paddingRight: 2,
  },
  dayCard: {
    minWidth: 74,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  dayCardSelected: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  dayCardToday: {
    borderColor: "rgba(34,197,94,0.7)",
  },
  dayCardWeekday: {
    color: "#94A3B8",
    fontSize: 11,
    marginBottom: 4,
  },
  dayCardWeekdaySelected: {
    color: "#E5E7EB",
  },
  dayCardDay: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
  },
  dayCardDaySelected: {
    color: "#FFFFFF",
  },
  dayCardGregorianSmall: {
    marginTop: 3,
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 12,
  },
  dayCardGregorianSmallSelected: {
    color: "#E2E8F0",
  },
  calendarHeader: {
    paddingBottom: 12,
    gap: 8,
  },
  topRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  topRowLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  topRowRight: {
    alignItems: "flex-end",
  },
  secondRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  dateCluster: {
    flex: 1,
    alignItems: "flex-end",
  },
  calendarIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(123,108,246,0.2)",
    borderWidth: 1,
    borderColor: "rgba(167,180,252,0.35)",
  },
  locationPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99,102,241,0.16)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: "100%",
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
  hijriDate: {
    color: "#E5E7EB",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "right",
  },
  gregorianDate: {
    color: "#9CA3AF",
    fontSize: 12,
    textAlign: "right",
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
  modalField: {
    gap: 8,
  },
  modalLabel: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    color: "#F3F4F6",
    fontSize: 14,
  },
  modalInputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
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
  soundOptionsRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  soundOptionGroup: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  soundOptionButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  soundOptionButtonActive: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  soundOptionText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
  },
  soundPreviewButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
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
