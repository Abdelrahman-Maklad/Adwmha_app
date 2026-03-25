import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Modal,
  Switch,
  Alert,
  TextInput,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useFonts } from "expo-font";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { seedIfEmpty } from "./db/seed";
import {
  loadCheckpoints,
  createCheckpoint,
  createTaskInCheckpoint,
  deleteCheckpoint,
  deleteTaskFromCheckpoint,
  updateCheckpointNotificationSettings,
  updateTaskNotificationSettings,
  getTimeFormatPreference,
  getThemePreference,
  TimeFormatPreference,
} from "./db/queries";
import { loadCompletionStateByDay, saveCompletionStateByDay } from "./db/progress";
import {
  initializePrayerTimesStaged,
  DateInfo,
  fetchHijriMonthCalendar,
  getCachedHijriMonthCalendar,
  getCachedHijriMonthCalendarWithoutLocation,
  HijriMonthDayCard,
  PrayerTimes,
  fetchPrayerTimesForDate,
  getPrayerTimesWithoutLocation,
} from "./services/prayerTimes";
import { formatHijriDate, formatGregorianDate, toArabicDigits } from "./utils/dateFormat";
import {
  cancelTaskNotifications,
  scheduleTaskNotifications,
} from "./services/taskNotifications";
import { ensureScheduleNext48h } from "./services/checkpointNotificationScheduler";
import StartScreen from "./StartScreen";
import { RootStackParamList } from "./navigation/types";
import { mapRedirectLabel } from "./utils/redirectMapper";
import { FONT_FAMILY } from "./constants/fonts";
import {
  ThemePreference,
  getThemeTokens,
  resolveThemePreference,
} from "./constants/theme";

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
  Plus,
  Trash2,
  ArrowUpRight,
  Settings,
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
  const [mounted, setMounted] = useState(expanded);
  const animHeight = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  useEffect(() => {
    if (expanded) {
      setMounted(true);
    }

    const animation = Animated.timing(animHeight, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    });

    animation.start(({ finished }) => {
      if (finished && !expanded) {
        setMounted(false);
      }
    });

    return () => {
      animation.stop();
    };
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
      {mounted ? (
        <View style={{ position: "absolute", width: "100%" }} onLayout={handleLayout}>
          {children}
        </View>
      ) : null}
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

function AnimatedTimelineAddButton({
  borderColor,
  backgroundColor,
  iconColor,
  onPress,
}: {
  borderColor: string;
  backgroundColor: string;
  iconColor: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback(
    (toValue: number) => {
      Animated.spring(scale, {
        toValue,
        useNativeDriver: true,
        friction: 5,
        tension: 220,
      }).start();
    },
    [scale]
  );

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[
          styles.timelineAddButton,
          {
            borderColor,
            backgroundColor,
          },
        ]}
        onPress={onPress}
        onPressIn={() => animateTo(0.9)}
        onPressOut={() => animateTo(1)}
      >
        <Plus size={15} color={iconColor} />
      </Pressable>
    </Animated.View>
  );
}

function CalendarHeader({
  dateInfo,
  locationLabel,
  totalPoints,
  theme,
  resolvedTheme,
  onReturnToToday,
  onOpenSettings,
}: {
  dateInfo: DateInfo | null;
  locationLabel: string;
  totalPoints: number;
  theme: ReturnType<typeof getThemeTokens>;
  resolvedTheme: "light" | "dark";
  onReturnToToday: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <View style={styles.calendarHeader}>
      <View style={styles.topRow}>
        <View style={styles.topRowRight}>
          <View>
            <Image
              source={
                resolvedTheme === "dark"
                  ? require("./assets/logo-white-dark-theme.png")
                  : require("./assets/logo-gradient-lightheme.png")
              }
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.topRowLeft}>
          <View style={styles.locationWrap}>
            <Pressable
              style={[
                styles.locationActionButton,
                { backgroundColor: theme.dayCardBg, borderColor: theme.dayCardBorder },
              ]}
              onPress={onOpenSettings}
            >
              <Settings size={16} color={theme.iconPrimary} />
            </Pressable>
            <View style={[styles.locationPill, { backgroundColor: theme.locationPillBg }]}>
            <MapPin size={14} color={theme.locationPillText} />
            <Text style={[styles.locationText, { color: theme.locationPillText }]} numberOfLines={1}>
              {locationLabel}
            </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.secondRow}>
        <View style={styles.dateCluster}>
          <Text style={[styles.hijriDate, { color: theme.textPrimary }]}>
            {dateInfo ? formatHijriDate(dateInfo.hijri) : "\u062C\u0627\u0631\u064A \u0627\u0644\u062A\u062D\u0645\u064A\u0644..."}
          </Text>
          <Text style={[styles.gregorianDate, { color: theme.textMuted }]}>
            {dateInfo ? formatGregorianDate(dateInfo.gregorian) : ""}
          </Text>
        </View>

        <View style={[styles.pointsCounter, { backgroundColor: theme.pointsPillBg }]}>
          <Star size={14} color={theme.pointsPillLabel} />
          <Text style={[styles.pointsCounterLabel, { color: theme.pointsPillLabel }]}>نقاط اليوم</Text>
          <Text style={[styles.pointsCounterValue, { color: theme.pointsPillValue }]}>
            {toArabicDigits(totalPoints)}
          </Text>
        </View>

        <View style={styles.headerActionRow}>
          <Pressable
            style={[
              styles.calendarIconWrap,
              {
                backgroundColor: theme.calendarIconBg,
                borderColor: theme.calendarIconBorder,
              },
            ]}
            onPress={onReturnToToday}
          >
            <Calendar size={20} color={theme.calendarIconColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
const MemoCalendarHeader = React.memo(CalendarHeader);

type NextPrayerSummary = {
  key: string;
  label: string;
  time: string;
  formattedTime: string;
  countdownLabel: string | null;
  isLive: boolean;
};

function buildNextPrayerSummary({
  todayDayTimes,
  todayGregorianDayKey,
  tomorrowDayTimes,
  timeFormatPreference,
  nowMs,
}: {
  todayDayTimes: PrayerTimes | null;
  todayGregorianDayKey: string;
  tomorrowDayTimes: PrayerTimes | null;
  timeFormatPreference: TimeFormatPreference;
  nowMs: number;
}): NextPrayerSummary | null {
  if (!todayDayTimes || !todayGregorianDayKey) return null;

  const prayers = PRAYER_COUNTDOWN_ORDER.map((prayer) => {
    const time = String(todayDayTimes[prayer.key as keyof PrayerTimes] ?? "");
    return {
      key: prayer.key,
      label: prayer.label,
      time,
      date: dateAtDayKeyTime(todayGregorianDayKey, time),
    };
  }).filter(
    (
      item
    ): item is {
      key: (typeof PRAYER_COUNTDOWN_ORDER)[number]["key"];
      label: (typeof PRAYER_COUNTDOWN_ORDER)[number]["label"];
      time: string;
      date: Date;
    } => Boolean(item.date)
  );

  if (prayers.length === 0) return null;

  const now = new Date(nowMs);
  let nextPrayer =
    prayers.find((prayer) => prayer.date && prayer.date.getTime() > now.getTime()) ?? null;

  let countdownTarget = nextPrayer?.date ?? null;
  let countdownTime = nextPrayer?.time ?? null;

  if (!nextPrayer) {
    const tomorrowDayKey = gregorianDayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const fallbackTomorrowFajr = tomorrowDayTimes?.fajr ?? todayDayTimes.fajr;
    const fajrDate = dateAtDayKeyTime(tomorrowDayKey, fallbackTomorrowFajr);
    nextPrayer = {
      key: "fajr",
      label: "الفجر",
      time: fallbackTomorrowFajr,
      date: fajrDate,
    };
    countdownTarget = fajrDate;
    countdownTime = fallbackTomorrowFajr;
  }

  if (!nextPrayer) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    nextPrayer =
      prayers.find((prayer) => parseMinutes(prayer.time) >= currentMinutes) ??
      prayers[0];
    countdownTarget = null;
    countdownTime = nextPrayer.time;
  }

  return {
    key: nextPrayer.key,
    label: nextPrayer.label,
    time: countdownTime ?? nextPrayer.time,
    formattedTime: formatTimeByPreference(countdownTime ?? nextPrayer.time, timeFormatPreference),
    countdownLabel:
      countdownTarget ? formatCountdownDuration(countdownTarget.getTime() - now.getTime()) : null,
    isLive: Boolean(countdownTarget),
  };
}

function CountdownCard({
  todayDayTimes,
  todayGregorianDayKey,
  tomorrowDayTimes,
  timeFormatPreference,
  theme,
}: {
  todayDayTimes: PrayerTimes | null;
  todayGregorianDayKey: string;
  tomorrowDayTimes: PrayerTimes | null;
  timeFormatPreference: TimeFormatPreference;
  theme: ReturnType<typeof getThemeTokens>;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!todayDayTimes) return;
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [todayDayTimes]);

  const nextPrayerSummary = useMemo(
    () =>
      buildNextPrayerSummary({
        todayDayTimes,
        todayGregorianDayKey,
        tomorrowDayTimes,
        timeFormatPreference,
        nowMs,
      }),
    [
      nowMs,
      todayDayTimes,
      todayGregorianDayKey,
      timeFormatPreference,
      tomorrowDayTimes,
    ]
  );

  if (!nextPrayerSummary) return null;

  return (
    <View
      style={[
        styles.countdownCard,
      ]}
    >
      <View
        style={[
          styles.countdownSummary,
        ]}
      >
        <View style={styles.countdownLabelRow}>
          <View style={styles.countdownMetric}>
            <View style={styles.countdownMetricLabelWrap}>
              <Landmark size={12} color={theme.iconPrimary} />
              <Text style={[styles.countdownInlineLabel, { color: theme.textMuted }]} numberOfLines={1}>
                المحطة القادمة
              </Text>
            </View>
          </View>
          <View style={[styles.countdownStick, { backgroundColor: withAlpha(theme.dayCardBorder, 0.4) }]} />
          <View style={styles.countdownMetric}>
            <View style={styles.countdownMetricLabelWrap}>
              <Bell size={11} color={theme.iconPrimary} />
              <Text style={[styles.countdownInlineLabel, { color: theme.textMuted }]} numberOfLines={1}>
                الموعد
              </Text>
            </View>
          </View>
          <View style={[styles.countdownStick, { backgroundColor: withAlpha(theme.dayCardBorder, 0.4) }]} />
          <View style={styles.countdownMetric}>
            <View style={styles.countdownMetricLabelWrap}>
              <Clock size={11} color={theme.iconPrimary} />
              <Text style={[styles.countdownInlineLabel, { color: theme.textMuted }]} numberOfLines={1}>
                الوقت المتبقي
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.countdownValueRow}>
          <View style={styles.countdownMetric}>
            <Text style={[styles.countdownInlineValue, { color: theme.textPrimary }]} numberOfLines={1}>
              {nextPrayerSummary.label}
            </Text>
          </View>
          <View style={[styles.countdownStick, { backgroundColor: withAlpha(theme.dayCardBorder, 0.4) }]} />
          <View style={styles.countdownMetric}>
            <Text style={[styles.countdownInlineValue, { color: theme.textPrimary }]} numberOfLines={1}>
              {nextPrayerSummary.formattedTime}
            </Text>
          </View>
          <View style={[styles.countdownStick, { backgroundColor: withAlpha(theme.dayCardBorder, 0.4) }]} />
          <View style={styles.countdownMetric}>
            <Text style={[styles.countdownInlineValue, { color: theme.iconPrimary }]} numberOfLines={1}>
              {nextPrayerSummary.countdownLabel ?? nextPrayerSummary.formattedTime}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
const MemoCountdownCard = React.memo(CountdownCard);

function formatTimeByPreference(hhmm: string, preference: TimeFormatPreference): string {
  const normalized = extractHHmm(hhmm);
  if (!normalized) {
    return preference === "12h" ? `${toArabicDigits("05:00")} ص` : toArabicDigits("05:00");
  }
  const [hhStr, mmStr] = normalized.split(":");
  const hh = Number(hhStr);
  const mm = Number(mmStr);
  if (!Number.isInteger(hh) || !Number.isInteger(mm)) {
    return preference === "12h" ? `${toArabicDigits("05:00")} ص` : toArabicDigits("05:00");
  }

  if (preference === "24h") {
    return toArabicDigits(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
  }

  const suffix = hh >= 12 ? "م" : "ص";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${toArabicDigits(`${String(h12).padStart(2, "0")}:${String(mm).padStart(2, "0")}`)} ${suffix}`;
}

function parseHHmmToDate(hhmm: string): Date {
  const now = new Date();
  const normalized = extractHHmm(hhmm);
  if (!normalized) return now;
  const [hhStr, mmStr] = normalized.split(":");
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
  const normalized = extractHHmm(hhmm);
  if (!normalized) return 0;
  const [h, m] = normalized.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

function parseTimeForSort(hhmm: string): number | null {
  const normalized = extractHHmm(hhmm);
  if (!normalized) return null;
  const [h, m] = normalized.split(":").map(Number);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

function extractHHmm(value: string): string | null {
  const raw = String(value || "").trim();
  if (!raw || raw === "api") return null;
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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

function parseDayKey(dayKey: string): Date | null {
  const match = String(dayKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  return new Date(year, month, day, 0, 0, 0, 0);
}

function dateAtDayKeyTime(dayKey: string, hhmm: string): Date | null {
  const baseDate = parseDayKey(dayKey);
  const normalized = extractHHmm(hhmm);
  if (!baseDate || !normalized) return null;
  const [hour, minute] = normalized.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  const next = new Date(baseDate);
  next.setHours(hour, minute, 0, 0);
  return next;
}

function formatCountdownDuration(ms: number): string {
  const clampedSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(clampedSeconds / 3600);
  const minutes = Math.floor((clampedSeconds % 3600) / 60);
  const seconds = clampedSeconds % 60;
  return toArabicDigits(
    `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  );
}

const PRAYER_CHECKPOINT_IDS = new Set(["cp_fajr", "cp_dhuhr", "cp_asr", "cp_maghrib", "cp_isha"]);
const PRAYER_PROGRESS_CHECKPOINTS = [
  { id: "cp_fajr", label: "الفجر" },
  { id: "cp_dhuhr", label: "الظهر" },
  { id: "cp_asr", label: "العصر" },
  { id: "cp_maghrib", label: "المغرب" },
  { id: "cp_isha", label: "العشاء" },
] as const;
const PRAYER_COUNTDOWN_ORDER = [
  { key: "fajr", label: "الفجر" },
  { key: "sunrise", label: "الشروق" },
  { key: "dhuhr", label: "الظهر" },
  { key: "asr", label: "العصر" },
  { key: "maghrib", label: "المغرب" },
  { key: "isha", label: "العشاء" },
] as const;

const FONTS = {
  regular: FONT_FAMILY.cairoRegular,
  semiBold: FONT_FAMILY.cairoSemiBold,
  bold: FONT_FAMILY.cairoBold,
} as const;
const REPEAT_MODE_OPTIONS = [
  { label: "يومي", value: "daily" as const },
  { label: "أسبوعي", value: "weekly" as const },
];
const WEEKDAY_OPTIONS = [
  { label: "الأحد", value: "Sunday" },
  { label: "الاثنين", value: "Monday" },
  { label: "الثلاثاء", value: "Tuesday" },
  { label: "الأربعاء", value: "Wednesday" },
  { label: "الخميس", value: "Thursday" },
  { label: "الجمعة", value: "Friday" },
  { label: "السبت", value: "Saturday" },
];
const DAY_CARD_PILL_HEIGHT = 34;
const DAY_CARD_PILL_WIDTH = 112;
const DAY_CARD_HORIZONTAL_SPACING = 6;
const DAY_CARD_SLOT_WIDTH = DAY_CARD_PILL_WIDTH + DAY_CARD_HORIZONTAL_SPACING;
const DAY_CARD_RAIL_HEIGHT = DAY_CARD_PILL_HEIGHT + 8;

function buildPrayerProgressById(
  checkpointsForDay: any[],
  completionState: Record<string, boolean>
): Record<string, boolean> {
  return PRAYER_PROGRESS_CHECKPOINTS.reduce<Record<string, boolean>>((acc, prayer) => {
    const checkpoint = checkpointsForDay.find((cp: any) => cp.id === prayer.id);
    const tasks = checkpoint?.tasks ?? [];
    const mainPrayerTask =
      tasks.find((task: any) => task?.type === "main_task") ??
      tasks.find((task: any) => String(task?.name ?? "").includes("صلاة"));
    acc[prayer.id] = Boolean(mainPrayerTask && completionState[mainPrayerTask.id]);
    return acc;
  }, {});
}

export default function TimelineScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [fontsLoaded] = useFonts({
    [FONTS.regular]: require("./assets/fonts/Cairo-Regular.ttf"),
    [FONTS.semiBold]: require("./assets/fonts/Cairo-SemiBold.ttf"),
    [FONTS.bold]: require("./assets/fonts/Cairo-Bold.ttf"),
  });

  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [dateInfo, setDateInfo] = useState<DateInfo | null>(null);
  const [monthDayCards, setMonthDayCards] = useState<HijriMonthDayCard[]>([]);
  const [selectedGregorianDayKey, setSelectedGregorianDayKey] = useState("");
  const [todayGregorianDayKey, setTodayGregorianDayKey] = useState("");
  const [locationLabel, setLocationLabel] = useState("الموقع غير متاح");
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [selectedDayTimes, setSelectedDayTimes] = useState<PrayerTimes | null>(null);
  const [todayDayTimes, setTodayDayTimes] = useState<PrayerTimes | null>(null);
  const [tomorrowDayTimes, setTomorrowDayTimes] = useState<PrayerTimes | null>(null);
  const [dayPrayerProgressByDay, setDayPrayerProgressByDay] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const [expandedCheckpointIds, setExpandedCheckpointIds] = useState<Set<string>>(new Set());
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
    isDefault: boolean;
  } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationTime, setNotificationTime] = useState(new Date());
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationText, setNotificationText] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingNotificationSettings, setSavingNotificationSettings] = useState(false);
  const [addCheckpointModalVisible, setAddCheckpointModalVisible] = useState(false);
  const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
  const [showAddCheckpointTimePicker, setShowAddCheckpointTimePicker] = useState(false);
  const [newCheckpointName, setNewCheckpointName] = useState("");
  const [newCheckpointTime, setNewCheckpointTime] = useState(new Date());
  const [newCheckpointRepeat, setNewCheckpointRepeat] = useState<"daily" | "weekly">("daily");
  const [newCheckpointRepeatDays, setNewCheckpointRepeatDays] = useState<string[]>([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskPoints, setNewTaskPoints] = useState("0");
  const [newTaskRepeat, setNewTaskRepeat] = useState<"daily" | "weekly">("daily");
  const [newTaskRepeatDays, setNewTaskRepeatDays] = useState<string[]>([]);
  const [addTaskCheckpointTarget, setAddTaskCheckpointTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [savingCrud, setSavingCrud] = useState(false);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("dark");
  const [timeFormatPreference, setTimeFormatPreferenceState] = useState<TimeFormatPreference>("24h");
  const dayCardsListRef = useRef<FlatList<HijriMonthDayCard> | null>(null);
  const pendingDayScrollIndexRef = useRef<number | null>(null);
  const didInitialDayAutoScrollRef = useRef(false);
  const previousSelectedGregorianDayKeyRef = useRef("");
  const checkpointsRequestRef = useRef(0);
  const completionRequestRef = useRef(0);
  const timesRequestRef = useRef(0);
  const dayPrayerProgressRequestRef = useRef(0);
  const selectedDayKeyRef = useRef("");

  const resolvedTheme = resolveThemePreference(themePreference);
  const theme = getThemeTokens(resolvedTheme);
  useEffect(() => {
    selectedDayKeyRef.current = selectedGregorianDayKey;
  }, [selectedGregorianDayKey]);

  useEffect(() => {
    if (!selectedGregorianDayKey) return;

    const previousDayKey = previousSelectedGregorianDayKeyRef.current;
    if (previousDayKey && previousDayKey !== selectedGregorianDayKey) {
      setExpandedCheckpointIds(new Set());
      setExpandedTasks(new Set());
    }

    previousSelectedGregorianDayKeyRef.current = selectedGregorianDayKey;
  }, [selectedGregorianDayKey]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [pref, timePref] = await Promise.all([
          getThemePreference(),
          getTimeFormatPreference(),
        ]);
        if (mounted) setThemePreferenceState(pref);
        if (mounted) setTimeFormatPreferenceState(timePref);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void (async () => {
        try {
          const [pref, timePref] = await Promise.all([
            getThemePreference(),
            getTimeFormatPreference(),
          ]);
          setThemePreferenceState(pref);
          setTimeFormatPreferenceState(timePref);
        } catch {}
      })();
    });
    return unsubscribe;
  }, [navigation]);

  const toggleWeekday = (
    value: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => {
      if (prev.includes(value)) return prev.filter((day) => day !== value);
      return [...prev, value];
    });
  };

  const refreshCheckpointsForDay = useCallback(async (dayKey?: string) => {
    const data = await loadCheckpoints(dayKey);
    setCheckpoints(data);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const todayKey = gregorianDayKey(new Date());
        if (!active) return;
        setTodayGregorianDayKey(todayKey);

        const staged = await initializePrayerTimesStaged();
        const result = staged.initial;
        if (!active) return;
        setDateInfo(result.date);
        setLocationLabel(result.locationLabel);
        setLocationCoords(result.location);
        setSelectedDayTimes(result.times);
        setTodayDayTimes(result.times);

        let cards: HijriMonthDayCard[] = [];
        if (result.location) {
          cards = await getCachedHijriMonthCalendar(new Date(), result.location.latitude, result.location.longitude);
          if (!active) return;
        } else {
          cards = await getCachedHijriMonthCalendarWithoutLocation(new Date());
          if (!active) return;
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
        setMonthDayCards(cards);
        setSelectedGregorianDayKey(initialSelectedKey);
        setDoneState({});

        void (async () => {
          try {
            await seedIfEmpty(result.times, result.lastThirdTime);
          } catch (startupError) {
            console.warn("Startup background setup failed:", startupError);
          }
        })();

        void (async () => {
          try {
            const refreshed = await staged.refresh;
            if (!active) return;
            setDateInfo(refreshed.date);
            setLocationLabel(refreshed.locationLabel);
            setLocationCoords(refreshed.location);
            setTodayDayTimes(refreshed.times);
            if (selectedDayKeyRef.current === "" || selectedDayKeyRef.current === todayKey) {
              setSelectedDayTimes(refreshed.times);
            }

            let refreshedCards: HijriMonthDayCard[] = [];
            if (refreshed.location) {
              refreshedCards = await fetchHijriMonthCalendar(
                new Date(),
                refreshed.location.latitude,
                refreshed.location.longitude
              );
              if (!active) return;
              if (refreshedCards.length === 0) {
                refreshedCards = await getCachedHijriMonthCalendar(
                  new Date(),
                  refreshed.location.latitude,
                  refreshed.location.longitude
                );
                if (!active) return;
              }
            } else {
              refreshedCards = await getCachedHijriMonthCalendarWithoutLocation(new Date());
              if (!active) return;
            }

            if (refreshedCards.length > 0) {
              setMonthDayCards(refreshedCards);
            }
          } catch (refreshError) {
            console.warn("Background prayer data refresh failed:", refreshError);
          }
        })();
      } catch (e: any) {
        if (!active) return;
        setErr(e?.message ?? String(e));
      } finally {
        if (!active) return;
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedGregorianDayKey) return;

    const checkpointsReqId = ++checkpointsRequestRef.current;
    const completionReqId = ++completionRequestRef.current;
    const timesReqId = ++timesRequestRef.current;
    const selectedDay = selectedGregorianDayKey;
    let active = true;

    (async () => {
      const [dayCheckpoints, dayCompletionState, cachedDayTimes] = await Promise.all([
        loadCheckpoints(selectedDay),
        loadCompletionStateByDay(selectedDay),
        getPrayerTimesWithoutLocation(selectedDay),
      ]);

      if (!active) return;
      if (checkpointsReqId === checkpointsRequestRef.current) {
        setCheckpoints(dayCheckpoints);
      }
      if (completionReqId === completionRequestRef.current) {
        setDoneState(dayCompletionState);
      }
      if (timesReqId === timesRequestRef.current) {
        setSelectedDayTimes(cachedDayTimes ?? null);
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedGregorianDayKey]);

  useEffect(() => {
    if (!selectedGregorianDayKey || !locationCoords) return;
    const timesReqId = ++timesRequestRef.current;
    let active = true;
    (async () => {
      const freshDayTimes = await fetchPrayerTimesForDate(
        locationCoords.latitude,
        locationCoords.longitude,
        selectedGregorianDayKey
      );
      if (!active || !freshDayTimes) return;
      if (timesReqId === timesRequestRef.current) {
        setSelectedDayTimes(freshDayTimes);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedGregorianDayKey, locationCoords]);

  useEffect(() => {
    if (!todayGregorianDayKey) return;
    let active = true;
    (async () => {
      const cachedTodayTimes = await getPrayerTimesWithoutLocation(todayGregorianDayKey);
      if (active && cachedTodayTimes) {
        setTodayDayTimes(cachedTodayTimes);
      }

      if (!locationCoords) return;
      const freshTodayTimes = await fetchPrayerTimesForDate(
        locationCoords.latitude,
        locationCoords.longitude,
        todayGregorianDayKey
      );
      if (active && freshTodayTimes) {
        setTodayDayTimes(freshTodayTimes);
      }
    })();

    return () => {
      active = false;
    };
  }, [locationCoords, todayGregorianDayKey]);

  useEffect(() => {
    if (monthDayCards.length === 0) {
      setDayPrayerProgressByDay({});
      return;
    }

    const requestId = ++dayPrayerProgressRequestRef.current;
    let active = true;

    void (async () => {
      const entries = await Promise.all(
        monthDayCards.map(async (day) => {
          const [dayCheckpoints, dayCompletionState] = await Promise.all([
            loadCheckpoints(day.gregorianKey),
            loadCompletionStateByDay(day.gregorianKey),
          ]);

          return [
            day.gregorianKey,
            buildPrayerProgressById(dayCheckpoints, dayCompletionState),
          ] as const;
        })
      );

      if (!active || requestId !== dayPrayerProgressRequestRef.current) return;
      setDayPrayerProgressByDay(Object.fromEntries(entries));
    })();

    return () => {
      active = false;
    };
  }, [monthDayCards]);

  useEffect(() => {
    if (!todayDayTimes || !todayGregorianDayKey) {
      setTomorrowDayTimes(null);
      return;
    }

    let active = true;
    const todayDate = parseDayKey(todayGregorianDayKey);
    if (!todayDate) {
      setTomorrowDayTimes(null);
      return;
    }

    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(todayDate.getDate() + 1);
    const tomorrowDayKey = gregorianDayKey(tomorrowDate);

    void (async () => {
      try {
        const cached = await getPrayerTimesWithoutLocation(tomorrowDayKey);
        if (active && cached) {
          setTomorrowDayTimes(cached);
        }

        if (!locationCoords) {
          if (active && !cached) setTomorrowDayTimes(null);
          return;
        }

        const fresh = await fetchPrayerTimesForDate(
          locationCoords.latitude,
          locationCoords.longitude,
          tomorrowDayKey
        );
        if (active) {
          setTomorrowDayTimes(fresh ?? cached ?? null);
        }
      } catch {
        if (active) setTomorrowDayTimes(null);
      }
    })();

    return () => {
      active = false;
    };
  }, [locationCoords, todayDayTimes, todayGregorianDayKey]);

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
    const timeByCheckpointId: Record<string, string> | null = selectedDayTimes
      ? {
          cp_fajr: selectedDayTimes.fajr,
          cp_sunrise: selectedDayTimes.sunrise,
          cp_dhuhr: selectedDayTimes.dhuhr,
          cp_asr: selectedDayTimes.asr,
          cp_maghrib: selectedDayTimes.maghrib,
          cp_isha: selectedDayTimes.isha,
          cp_lastthird: calculateLastThirdFromTimes(selectedDayTimes.isha, selectedDayTimes.fajr),
        }
      : null;

    const base = timeByCheckpointId
      ? checkpoints.map((cp: any) => {
          const nextTime = timeByCheckpointId[cp.id];
          if (!nextTime) return cp;
          return { ...cp, time: nextTime };
        })
      : checkpoints;

    return [...base].sort((a: any, b: any) => {
      const aTime = parseTimeForSort(a.time);
      const bTime = parseTimeForSort(b.time);
      if (aTime != null && bTime != null && aTime !== bTime) return aTime - bTime;
      if (aTime != null && bTime == null) return -1;
      if (aTime == null && bTime != null) return 1;
      const aOrder = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [checkpoints, selectedDayTimes]);

  const prayerProgressDots = useMemo(() => {
    return PRAYER_PROGRESS_CHECKPOINTS.map((prayer) => {
      const checkpoint = checkpointsForSelectedDay.find((cp: any) => cp.id === prayer.id);
      const tasks = checkpoint?.tasks ?? [];
      const isComplete =
        tasks.length > 0 &&
        tasks.every((task: any) => {
          if (!doneState[task.id]) return false;
          const checklist = task.checklist ?? [];
          return checklist.every((item: any) => Boolean(doneState[item.id]));
        });

      return {
        ...prayer,
        isComplete,
      };
    });
  }, [checkpointsForSelectedDay, doneState]);

  const prayerProgressById = useMemo(() => {
    return prayerProgressDots.reduce<Record<string, boolean>>((acc, prayer) => {
      acc[prayer.id] = prayer.isComplete;
      return acc;
    }, {});
  }, [prayerProgressDots]);

  const isDefaultCheckpoint = (cp: any) => Boolean(cp?.default);
  const isDefaultTask = (task: any) => Boolean(task?.default);
  const canAddTaskToCheckpoint = (cp: any) =>
    (Boolean(cp?.default) && Boolean(cp?.locked)) || (!Boolean(cp?.default) && !Boolean(cp?.locked));
  const canDeleteCheckpoint = (cp: any) => !Boolean(cp?.default) && !Boolean(cp?.locked);
  const canDeleteTask = (task: any) => !Boolean(task?.default) && !Boolean(task?.locked);

  const resolveTodayPrayerTimeForCheckpoint = async (cp: any): Promise<string> => {
    const fallbackTime = String(cp?.notification_time || cp?.time || "08:00");
    const checkpointId = String(cp?.id ?? "");
    if (!locationCoords) {
      const todayKey = gregorianDayKey(new Date());
      const cached = await getPrayerTimesWithoutLocation(todayKey);
      if (!cached) return fallbackTime;

      const timeByCheckpointId: Record<string, string> = {
        cp_fajr: cached.fajr,
        cp_sunrise: cached.sunrise,
        cp_dhuhr: cached.dhuhr,
        cp_asr: cached.asr,
        cp_maghrib: cached.maghrib,
        cp_isha: cached.isha,
        cp_lastthird: calculateLastThirdFromTimes(cached.isha, cached.fajr),
      };

      return timeByCheckpointId[checkpointId] ?? fallbackTime;
    }

    const todayKey = gregorianDayKey(new Date());
    const times = await fetchPrayerTimesForDate(
      locationCoords.latitude,
      locationCoords.longitude,
      todayKey
    );
    if (!times) return fallbackTime;

    const timeByCheckpointId: Record<string, string> = {
      cp_fajr: times.fajr,
      cp_sunrise: times.sunrise,
      cp_dhuhr: times.dhuhr,
      cp_asr: times.asr,
      cp_maghrib: times.maghrib,
      cp_isha: times.isha,
      cp_lastthird: calculateLastThirdFromTimes(times.isha, times.fajr),
    };

    return timeByCheckpointId[checkpointId] ?? fallbackTime;
  };

  useEffect(() => {
    if (!selectedGregorianDayKey) return;
    if (selectedGregorianDayKey !== todayGregorianDayKey) return;

    if (expandedCheckpointIds.size > 0) return;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let bestId: string | null = null;
    let bestMinutes = -1;

    checkpointsForSelectedDay.forEach((cp: any) => {
      const minutes = parseTimeForSort(String(cp?.time ?? ""));
      if (minutes == null) return;
      if (minutes <= nowMinutes && minutes >= bestMinutes) {
        bestMinutes = minutes;
        bestId = String(cp.id);
      }
    });

    if (!bestId) return;
    setExpandedCheckpointIds(new Set([bestId]));
  }, [checkpointsForSelectedDay, selectedGregorianDayKey, todayGregorianDayKey, expandedCheckpointIds.size]);

  const toggleCheckpoint = useCallback((checkpointId: string) => {
    setExpandedCheckpointIds((prev) => {
      const next = new Set(prev);
      if (next.has(checkpointId)) next.delete(checkpointId);
      else next.add(checkpointId);
      return next;
    });
  }, []);

  const toggleTask = useCallback((checkpointId: string, taskId: string) => {
    const key = `${checkpointId}_${taskId}`;
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleItemDone = useCallback(async (itemId: string) => {
    if (!selectedGregorianDayKey) return;
    const nextDone = !(doneState[itemId] ?? false);
    const nextDoneState = {
      ...doneState,
      [itemId]: nextDone,
    };

    setDoneState(nextDoneState);
    setDayPrayerProgressByDay((prev) => ({
      ...prev,
      [selectedGregorianDayKey]: buildPrayerProgressById(checkpointsForSelectedDay, nextDoneState),
    }));

    try {
      await saveCompletionStateByDay(selectedGregorianDayKey, itemId, nextDone);
    } catch (e) {
      console.error("Failed to persist completion state:", e);
    }
  }, [checkpointsForSelectedDay, doneState, selectedGregorianDayKey]);

  const handleSelectDay = useCallback((dayKey: string) => {
    setSelectedGregorianDayKey(dayKey);
  }, []);

  const handleReturnToToday = useCallback(() => {
    if (!todayGregorianDayKey) return;
    setSelectedGregorianDayKey(todayGregorianDayKey);
    const index = monthDayCards.findIndex((day) => day.gregorianKey === todayGregorianDayKey);
    if (index >= 0) {
      pendingDayScrollIndexRef.current = index;
      dayCardsListRef.current?.scrollToIndex({ index, animated: true });
    }
  }, [monthDayCards, todayGregorianDayKey]);

  const handleDayCardsScrollToIndexFailed = useCallback(() => {
    const index = pendingDayScrollIndexRef.current;
    if (index == null) return;
    if (index >= 0) {
      dayCardsListRef.current?.scrollToIndex({ index, animated: true });
    }
  }, []);

  useEffect(() => {
    if (didInitialDayAutoScrollRef.current) return;
    if (monthDayCards.length === 0) return;

    const todayIndex = monthDayCards.findIndex((day) => day.gregorianKey === todayGregorianDayKey);
    const selectedIndex = monthDayCards.findIndex(
      (day) => day.gregorianKey === selectedGregorianDayKey
    );
    const targetIndex = todayIndex >= 0 ? todayIndex : selectedIndex;
    if (targetIndex < 0) return;

    pendingDayScrollIndexRef.current = targetIndex;
    const timer = setTimeout(() => {
      dayCardsListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
      didInitialDayAutoScrollRef.current = true;
    }, 0);

    return () => clearTimeout(timer);
  }, [monthDayCards, selectedGregorianDayKey, todayGregorianDayKey]);

  const getDayCardItemLayout = useCallback(
    (_data: ArrayLike<HijriMonthDayCard> | null | undefined, index: number) => ({
      length: DAY_CARD_SLOT_WIDTH,
      offset: DAY_CARD_SLOT_WIDTH * index,
      index,
    }),
    []
  );

  const openAddCheckpointModal = () => {
    setNewCheckpointName("");
    setNewCheckpointTime(new Date());
    setNewCheckpointRepeat("daily");
    setNewCheckpointRepeatDays([]);
    setShowAddCheckpointTimePicker(false);
    setAddCheckpointModalVisible(true);
  };

  const openAddTaskModal = (cp: any) => {
    setAddTaskCheckpointTarget({ id: cp.id, name: cp.name });
    setNewTaskName("");
    setNewTaskPoints("0");
    setNewTaskRepeat("daily");
    setNewTaskRepeatDays([]);
    setAddTaskModalVisible(true);
  };

  const onAddCheckpointTimeChanged = (_event: DateTimePickerEvent, selected?: Date) => {
    if (selected) setNewCheckpointTime(selected);
    setShowAddCheckpointTimePicker(false);
  };

  const saveNewCheckpoint = async () => {
    const name = newCheckpointName.trim();
    if (!name) {
      Alert.alert("خطأ", "يرجى إدخال اسم المرحلة.");
      return;
    }
    if (newCheckpointRepeat === "weekly" && newCheckpointRepeatDays.length === 0) {
      Alert.alert("خطأ", "يرجى اختيار يوم واحد على الأقل للتكرار الأسبوعي.");
      return;
    }

    try {
      setSavingCrud(true);
      await createCheckpoint({
        name,
        time: toHHmm(newCheckpointTime),
        repeat: newCheckpointRepeat,
        repeatDays: newCheckpointRepeatDays,
      });

      await refreshCheckpointsForDay(selectedGregorianDayKey || todayGregorianDayKey);
      await ensureScheduleNext48h("checkpoint_settings_changed");
      setAddCheckpointModalVisible(false);
    } catch (e) {
      console.error("Failed to create checkpoint:", e);
      Alert.alert("خطأ", "تعذر إنشاء المرحلة.");
    } finally {
      setSavingCrud(false);
    }
  };

  const saveNewTask = async () => {
    if (!addTaskCheckpointTarget) return;
    const name = newTaskName.trim();
    if (!name) {
      Alert.alert("خطأ", "يرجى إدخال اسم المهمة.");
      return;
    }
    if (newTaskRepeat === "weekly" && newTaskRepeatDays.length === 0) {
      Alert.alert("خطأ", "يرجى اختيار يوم واحد على الأقل للتكرار الأسبوعي.");
      return;
    }

    const parsedPoints = Number(newTaskPoints);
    const points = Number.isFinite(parsedPoints) ? Math.max(0, parsedPoints) : 0;

    try {
      setSavingCrud(true);
      const created = await createTaskInCheckpoint({
        checkpointId: addTaskCheckpointTarget.id,
        name,
        points,
        repeat: newTaskRepeat,
        repeatDays: newTaskRepeatDays,
      });
      if (!created) {
        Alert.alert("خطأ", "تعذر إنشاء المهمة.");
        return;
      }

      await refreshCheckpointsForDay(selectedGregorianDayKey || todayGregorianDayKey);
      setAddTaskModalVisible(false);
      setAddTaskCheckpointTarget(null);
    } catch (e) {
      console.error("Failed to create task:", e);
      Alert.alert("خطأ", "تعذر إنشاء المهمة.");
    } finally {
      setSavingCrud(false);
    }
  };

  const requestDeleteCheckpoint = (cp: any) => {
    if (!canDeleteCheckpoint(cp)) return;
    Alert.alert("حذف المرحلة", `هل تريد حذف "${cp.name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setSavingCrud(true);
              const tasks = cp.tasks ?? [];
              for (const task of tasks) {
                if (task?.notifications) {
                  await cancelTaskNotifications(task.id);
                }
              }

              const deleted = await deleteCheckpoint(cp.id);
              if (!deleted) {
                Alert.alert("خطأ", "تعذر حذف المرحلة.");
                return;
              }

              setCheckpoints((prev) => prev.filter((checkpoint: any) => checkpoint.id !== cp.id));
              setExpandedCheckpointIds((prev) => {
                const next = new Set(prev);
                next.delete(cp.id);
                return next;
              });
              setExpandedTasks((prev) => {
                const next = new Set<string>();
                prev.forEach((key) => {
                  if (!key.startsWith(`${cp.id}_`)) next.add(key);
                });
                return next;
              });
              await ensureScheduleNext48h("checkpoint_settings_changed");
            } catch (e) {
              console.error("Failed to delete checkpoint:", e);
              Alert.alert("خطأ", "تعذر حذف المرحلة.");
            } finally {
              setSavingCrud(false);
            }
          })();
        },
      },
    ]);
  };

  const requestDeleteTask = (cp: any, task: any) => {
    if (!canDeleteTask(task)) return;
    Alert.alert("حذف المهمة", `هل تريد حذف "${task.name}"؟`, [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              setSavingCrud(true);
              if (task.notifications) {
                await cancelTaskNotifications(task.id);
              }

              const updated = await deleteTaskFromCheckpoint({
                checkpointId: cp.id,
                taskId: task.id,
              });
              if (!updated) {
                Alert.alert("خطأ", "تعذر حذف المهمة.");
                return;
              }

              setCheckpoints((prev) =>
                prev.map((checkpoint: any) =>
                  checkpoint.id === updated.checkpoint.id ? updated.checkpoint : checkpoint
                )
              );
              setExpandedTasks((prev) => {
                const next = new Set(prev);
                next.delete(`${cp.id}_${task.id}`);
                return next;
              });
            } catch (e) {
              console.error("Failed to delete task:", e);
              Alert.alert("خطأ", "تعذر حذف المهمة.");
            } finally {
              setSavingCrud(false);
            }
          })();
        },
      },
    ]);
  };

  const toggleDefaultCheckpointNotifications = async (cp: any) => {
    try {
      const nextEnabled = !Boolean(cp.notifications);
      const effectiveTime = await resolveTodayPrayerTimeForCheckpoint(cp);
      const effectiveTitle = String(cp.notification_title ?? "").trim() || `تذكير: ${cp.name}`;
      const effectiveText = String(cp.notification_text ?? "").trim() || `حان وقت ${cp.name}`;
      const effectiveSound = "default";

      const updated = await updateCheckpointNotificationSettings({
        checkpointId: cp.id,
        notifications: nextEnabled,
        notificationTime: effectiveTime,
        notificationTitle: effectiveTitle,
        notificationText: effectiveText,
        notificationSound: effectiveSound,
      });

      if (!updated) {
        Alert.alert("خطأ", "تعذر تحديث إعدادات تنبيه المرحلة.");
        return;
      }

      await refreshCheckpointsForDay(selectedGregorianDayKey || todayGregorianDayKey);
      await ensureScheduleNext48h("checkpoint_settings_changed");
    } catch (e) {
      console.error("Failed to toggle default checkpoint notifications:", e);
      Alert.alert("خطأ", "حدث خطأ أثناء تحديث إعدادات التنبيه.");
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
      isDefault: isDefaultTask(task),
    });
    setNotificationsEnabled(Boolean(task.notifications));
    setNotificationTime(parseHHmmToDate(task.notification_time || cp.time || "08:00"));
    setNotificationTitle(String(task.notification_title ?? "").trim());
    setNotificationText(String(task.notification_text ?? "").trim());
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
      isDefault: isDefaultCheckpoint(cp),
    });
    setNotificationsEnabled(Boolean(cp.notifications));
    setNotificationTime(parseHHmmToDate(cp.notification_time || cp.time || "08:00"));
    setNotificationTitle(String(cp.notification_title ?? "").trim());
    setNotificationText(String(cp.notification_text ?? "").trim());
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
    const normalizedSound = "default";

    try {
      setSavingNotificationSettings(true);

      if (selectedNotificationTarget.type === "task") {
        const effectiveSound = selectedNotificationTarget.isDefault ? "default" : normalizedSound;

        const updated = await updateTaskNotificationSettings({
          taskId: selectedNotificationTarget.itemId,
          notifications: notificationsEnabled,
          notificationTime: notificationTimeHHmm,
          notificationTitle: normalizedTitle,
          notificationText: normalizedText,
          notificationSound: effectiveSound,
        });

        if (!updated) {
          Alert.alert("خطأ", "تعذر تحديث إعدادات تنبيه المهمة.");
          return;
        }

        await refreshCheckpointsForDay(selectedGregorianDayKey || todayGregorianDayKey);

        if (notificationsEnabled) {
          const scheduled = await scheduleTaskNotifications({
            taskId: selectedNotificationTarget.itemId,
            taskName: selectedNotificationTarget.itemName,
            repeat: selectedNotificationTarget.repeat,
            repeatDays: selectedNotificationTarget.repeatDays,
            notificationTime: notificationTimeHHmm,
            notificationTitle: normalizedTitle,
            notificationText: normalizedText,
            notificationSound: effectiveSound,
          });

          if (!scheduled) {
            Alert.alert("تنبيه", "تم الحفظ ولكن تعذر جدولة إشعار المهمة.");
          }
        } else {
          await cancelTaskNotifications(selectedNotificationTarget.itemId);
        }
      } else {
        let effectiveTime = notificationTimeHHmm;
        let effectiveSound = normalizedSound;
        let effectiveTitle = normalizedTitle;
        let effectiveText = normalizedText;

        if (selectedNotificationTarget.isDefault) {
          const currentCheckpoint = checkpoints.find(
            (checkpoint: any) => checkpoint.id === selectedNotificationTarget.checkpointId
          );
          effectiveTime = currentCheckpoint
            ? await resolveTodayPrayerTimeForCheckpoint(currentCheckpoint)
            : notificationTimeHHmm;
          effectiveSound = "default";
          effectiveTitle =
            String(currentCheckpoint?.notification_title ?? "").trim() ||
            `تذكير: ${selectedNotificationTarget.itemName}`;
          effectiveText =
            String(currentCheckpoint?.notification_text ?? "").trim() ||
            `حان وقت ${selectedNotificationTarget.itemName}`;
        }

        const updated = await updateCheckpointNotificationSettings({
          checkpointId: selectedNotificationTarget.checkpointId,
          notifications: notificationsEnabled,
          notificationTime: effectiveTime,
          notificationTitle: effectiveTitle,
          notificationText: effectiveText,
          notificationSound: effectiveSound,
        });

        if (!updated) {
          Alert.alert("خطأ", "تعذر تحديث إعدادات تنبيه المرحلة.");
          return;
        }

        await refreshCheckpointsForDay(selectedGregorianDayKey || todayGregorianDayKey);
        await ensureScheduleNext48h("checkpoint_settings_changed");
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

  const renderDayCard = useCallback(
    ({ item: day }: { item: HijriMonthDayCard }) => {
      const selected = day.gregorianKey === selectedGregorianDayKey;
      const prayerProgress = dayPrayerProgressByDay[day.gregorianKey] ?? {};
      return (
        <Pressable
          style={[
            styles.dayCard,
            { borderColor: theme.dayCardBorder, backgroundColor: theme.dayCardBg },
            selected && styles.dayCardSelected,
            selected && {
              borderColor: theme.dayCardSelectedBorder,
              backgroundColor: theme.dayCardSelectedBg,
            },
            day.isToday && styles.dayCardToday,
          ]}
          onPress={() => handleSelectDay(day.gregorianKey)}
        >
          <View style={styles.dayCardContent}>
            <Text
              style={[
                styles.dayCardDay,
                { color: theme.textPrimary },
                selected && styles.dayCardDaySelected,
                selected && { color: theme.textOnAccent },
              ]}
              numberOfLines={1}
            >
              {toArabicDigits(day.hijriDay)}
            </Text>
            <Text
              style={[
                styles.dayCardPipe,
                { color: selected ? withAlpha(theme.textOnAccent, 0.6) : theme.textMuted },
              ]}
            >
              |
            </Text>
            <Text
              style={[
                styles.dayCardGregorianSmall,
                { color: theme.textMuted },
                selected && styles.dayCardGregorianSmallSelected,
                selected && { color: theme.textSecondary },
              ]}
              numberOfLines={1}
            >
              {`${toArabicDigits(normalizeDayWithoutLeadingZero(day.gregorianDay))} ${day.gregorianMonthAr}`}
            </Text>
          </View>
          <View style={styles.dayCardPrayerDotsRow}>
            {PRAYER_PROGRESS_CHECKPOINTS.map((prayer) => {
              const isComplete = Boolean(prayerProgress[prayer.id]);
              return (
                <View
                  key={`${day.gregorianKey}_${prayer.id}`}
                  style={[
                    styles.dayCardPrayerDot,
                    {
                      borderColor: selected
                        ? withAlpha(theme.textOnAccent, isComplete ? 0.85 : 0.45)
                        : withAlpha(theme.textMuted, isComplete ? 0.65 : 0.28),
                    },
                    isComplete && {
                      backgroundColor: selected ? theme.textOnAccent : theme.iconPrimary,
                    },
                  ]}
                />
              );
            })}
          </View>
        </Pressable>
      );
    },
    [
      dayPrayerProgressByDay,
      handleSelectDay,
      selectedGregorianDayKey,
      theme.dayCardBg,
      theme.dayCardBorder,
      theme.dayCardSelectedBg,
      theme.dayCardSelectedBorder,
      theme.iconPrimary,
      theme.textMuted,
      theme.textOnAccent,
      theme.textPrimary,
      theme.textSecondary,
    ]
  );

  const isDefaultTaskModal =
    selectedNotificationTarget?.type === "task" && Boolean(selectedNotificationTarget?.isDefault);

  if (err) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.screenBackground }]}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Error</Text>
        <Text style={[styles.errText, { color: "#DC2626" }]}>{err}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return <StartScreen />;
  }

  return (
    <ImageBackground
      source={theme.backgroundImage}
      style={[styles.screen, { backgroundColor: theme.screenBackground }]}
      imageStyle={{ transform: [{ scale: 1.5}, {translateX: -20 }] }}
      resizeMode="cover"
    >
      <View style={[styles.backgroundOverlay, { backgroundColor: theme.overlayColor }]} />
      <View
        style={[
          styles.fixedTopBarContainer,
          { backgroundColor: theme.topBarBackground, borderBottomColor: theme.topBarBorder },
        ]}
      >
        <MemoCalendarHeader
          dateInfo={dateInfo}
          locationLabel={locationLabel}
          totalPoints={totalPoints}
          theme={theme}
          resolvedTheme={resolvedTheme}
          onReturnToToday={handleReturnToToday}
          onOpenSettings={() => navigation.navigate("Settings")}
        />
        <View style={styles.topContentRow}>
          <MemoCountdownCard
            todayDayTimes={todayDayTimes}
            todayGregorianDayKey={todayGregorianDayKey}
            tomorrowDayTimes={tomorrowDayTimes}
            timeFormatPreference={timeFormatPreference}
            theme={theme}
          />
          <View style={styles.dayCardsRail}>
            <FlatList
              ref={dayCardsListRef}
              data={monthDayCards}
              extraData={selectedGregorianDayKey}
              horizontal
              inverted
              showsHorizontalScrollIndicator={false}
              getItemLayout={getDayCardItemLayout}
              keyExtractor={(day) => day.gregorianKey}
              onScrollToIndexFailed={handleDayCardsScrollToIndexFailed}
              contentContainerStyle={styles.dayCardsContainer}
              ItemSeparatorComponent={() => <View style={styles.dayCardSeparator} />}
              renderItem={renderDayCard}
            />
          </View>
        </View>
      </View>
      <FlatList
        style={{ flex: 1 }}
        data={checkpointsForSelectedDay}
        keyExtractor={(cp) => cp.id}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews
        contentContainerStyle={{ paddingTop: 8, paddingHorizontal: 14, paddingBottom: 28 }}
        ListHeaderComponent={
          <View style={styles.checkpointAddRow}>
            <View style={styles.timelineCol}>
              <AnimatedTimelineAddButton
                borderColor={theme.actionButtonBorder}
                backgroundColor={theme.actionButtonBg}
                iconColor={theme.iconPrimary}
                onPress={openAddCheckpointModal}
              />
              <View
                style={[
                  styles.timelineAddStem,
                  { backgroundColor: withAlpha(theme.primary, 0.3) },
                ]}
              />
            </View>
            <View style={styles.contentCol} />
          </View>
        }
        renderItem={({ item: cp, index }) => {
          const CpIcon = ICON_MAP[String(cp.icon || "").toLowerCase()];
          const color = cp.color || "#7B6CF6";
          const isCheckpointExpanded = expandedCheckpointIds.has(cp.id);
          const tasks = cp.tasks ?? [];
          const isLastCheckpoint = index === checkpointsForSelectedDay.length - 1;

          return (
            <View style={styles.checkpointRow}>
              <View style={styles.timelineCol}>
                <View
                  style={[
                    styles.timelineLineTop,
                    { backgroundColor: index === 0 ? "transparent" : withAlpha(color, 0.3) },
                  ]}
                />
                <View
                  style={[
                    styles.timelineDotOuter,
                    {
                      borderColor: withAlpha(color, 0.36),
                      backgroundColor: withAlpha(color, 0.14),
                    },
                  ]}
                >
                  <View style={[styles.timelineDotInner, { backgroundColor: color }]} />
                </View>
                <View
                  style={[
                    styles.timelineLineBottom,
                    { backgroundColor: isLastCheckpoint ? "transparent" : withAlpha(color, 0.3) },
                  ]}
                />
              </View>

              <View style={styles.contentCol}>
                <View style={styles.checkpointHeaderRow}>
                  <View style={styles.circleActionsRow}>
                    {cp.enable_disable_notifications && (
                      <Pressable
                        style={[
                          styles.circleActionButton,
                          { borderColor: theme.actionButtonBorder, backgroundColor: theme.actionButtonBg },
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          if (isDefaultCheckpoint(cp)) {
                            void toggleDefaultCheckpointNotifications(cp);
                            return;
                          }
                          openCheckpointNotificationMenu(cp);
                        }}
                      >
                        {cp.notifications ? (
                          <Bell size={15} color={theme.iconPrimary} />
                        ) : (
                          <BellOff size={15} color={theme.iconPrimary} />
                        )}
                      </Pressable>
                    )}

                    {canAddTaskToCheckpoint(cp) && (
                      <Pressable
                        style={[
                          styles.circleActionButton,
                          { borderColor: theme.actionButtonBorder, backgroundColor: theme.actionButtonBg },
                        ]}
                        onPress={(event) => {
                          event.stopPropagation();
                          openAddTaskModal(cp);
                        }}
                      >
                        <Plus size={15} color={theme.iconPrimary} />
                      </Pressable>
                    )}

                    {canDeleteCheckpoint(cp) && (
                      <Pressable
                        style={[styles.circleActionButton, styles.circleActionDanger]}
                        onPress={(event) => {
                          event.stopPropagation();
                          requestDeleteCheckpoint(cp);
                        }}
                      >
                        <Trash2 size={15} color="#FCA5A5" />
                      </Pressable>
                    )}
                  </View>

                  <Pressable
                    style={[
                      styles.headerPill,
                      {
                        borderColor: theme.headerPillBorder,
                        backgroundColor: theme.headerPillBg,
                      },
                    ]}
                    onPress={() => toggleCheckpoint(cp.id)}
                  >
                    <View style={styles.headerInner}>
                      <AnimatedChevron expanded={isCheckpointExpanded} color={color} />

                      <View style={styles.headerIcon}>
                        {CpIcon ? <CpIcon size={16} color={color} /> : null}
                      </View>

                      <Text style={[styles.headerName, { color: theme.textPrimary }]} numberOfLines={1}>
                        {cp.name}
                      </Text>

                      <Text style={[styles.headerTimeText, { color }]}>
                        {formatTimeByPreference(cp.time, timeFormatPreference)}
                      </Text>

                      {PRAYER_CHECKPOINT_IDS.has(String(cp.id)) ? (
                        <View
                          style={[
                            styles.headerPrayerDot,
                            prayerProgressById[String(cp.id)]
                              ? { backgroundColor: color, borderColor: color }
                              : {
                                  backgroundColor: "transparent",
                                  borderColor: withAlpha(theme.textMuted, 0.35),
                                },
                          ]}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                </View>

                <Accordion expanded={isCheckpointExpanded}>
                  <View style={styles.tasksContainer}>
                    {tasks.map((t: any) => {
                      const TaskIcon = ICON_MAP[String(t.icon || "").toLowerCase()];
                      const isMain = t.type === "main_task";
                      const taskColor = isMain ? color : theme.textPrimary;
                      const taskDone = Boolean(doneState[t.id]);
                      const taskPoints = Number(t.points ?? 0);
                      const hasChecklist = (t.checklist ?? []).length > 0;
                      const isTaskExpanded = expandedTasks.has(`${cp.id}_${t.id}`);
                      const redirectTarget = mapRedirectLabel(String(t.redirect ?? ""));

                      return (
                        <View key={t.id} style={styles.taskWrapper}>
                          <View style={styles.taskRow}>
                            <View style={styles.circleActionsRow}>
                              {t.enable_disable_notifications && (
                                <Pressable
                                  style={[
                                    styles.circleActionButton,
                                    { borderColor: theme.actionButtonBorder, backgroundColor: theme.actionButtonBg },
                                  ]}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    openTaskNotificationMenu(cp, t);
                                  }}
                                >
                                  {t.notifications ? (
                                    <Bell size={15} color={theme.iconPrimary} />
                                  ) : (
                                    <BellOff size={15} color={theme.iconPrimary} />
                                  )}
                                </Pressable>
                              )}

                              {canDeleteTask(t) && (
                                <Pressable
                                  style={[styles.circleActionButton, styles.circleActionDanger]}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    requestDeleteTask(cp, t);
                                  }}
                                >
                                  <Trash2 size={15} color="#FCA5A5" />
                                </Pressable>
                              )}

                              {redirectTarget && (
                                <Pressable
                                  style={[
                                    styles.circleActionButton,
                                    styles.circleActionRedirect,
                                    {
                                      borderColor: theme.redirectActionBorder,
                                      backgroundColor: theme.redirectActionBg,
                                    },
                                  ]}
                                  onPress={(event) => {
                                    event.stopPropagation();
                                    if (redirectTarget.kind === "adhkar") {
                                      navigation.navigate("AdhkarDetails", {
                                        setId: redirectTarget.setId,
                                      });
                                      return;
                                    }
                                    navigation.navigate("QuranReference", {
                                      titleAr: redirectTarget.titleAr,
                                      quran: redirectTarget.quran,
                                    });
                                  }}
                                >
                                  <ArrowUpRight size={15} color={theme.redirectIcon} />
                                </Pressable>
                              )}
                            </View>

                            <Pressable
                              style={[
                                styles.taskCard,
                                {
                                  backgroundColor: taskDone
                                    ? withAlpha(color, 0.14)
                                    : withAlpha(color, 0.05),
                                  borderColor: taskDone
                                    ? withAlpha(color, 0.34)
                                    : withAlpha(color, 0.12),
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

                              {taskPoints > 0 && (
                                <View
                                  style={[
                                    styles.pointsBadge,
                                    { backgroundColor: withAlpha(color, 0.2) },
                                  ]}
                                >
                                  <Text style={[styles.pointsText, { color }]}>+{taskPoints}</Text>
                                </View>
                              )}

                              {hasChecklist && (
                                <AnimatedChevron expanded={isTaskExpanded} color={taskColor} />
                              )}
                            </Pressable>
                          </View>

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
                                            : theme.checklistBg,
                                          borderColor: itemDone
                                            ? withAlpha(color, 0.3)
                                            : theme.checklistBorder,
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
                                          color={itemDone ? darkenColor(color, 20) : theme.iconMuted}
                                        />
                                      )}

                                      <Text
                                        style={[
                                          styles.checklistText,
                                          {
                                            color: itemDone ? darkenColor(color, 10) : theme.textSecondary,
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
        visible={addCheckpointModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCheckpointModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.modalCardBg, borderColor: theme.modalCardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>إضافة مرحلة جديدة</Text>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>اسم المرحلة</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: theme.inputBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  },
                ]}
                value={newCheckpointName}
                onChangeText={setNewCheckpointName}
                placeholder="مثال: مراجعة القرآن"
                placeholderTextColor={theme.inputPlaceholder}
                textAlign="right"
              />
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>وقت المرحلة</Text>
              <Pressable
                style={[
                  styles.timeSelectButton,
                  { borderColor: theme.inputBorder, backgroundColor: theme.inputBg },
                ]}
                onPress={() => setShowAddCheckpointTimePicker(true)}
              >
                <Text style={[styles.timeSelectText, { color: theme.inputText }]}>
                  {formatTimeByPreference(toHHmm(newCheckpointTime), timeFormatPreference)}
                </Text>
              </Pressable>
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>نوع التكرار</Text>
              <View style={styles.repeatModeRow}>
                {REPEAT_MODE_OPTIONS.map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.repeatModeButton,
                      {
                        borderColor: theme.inputBorder,
                        backgroundColor: theme.inputBg,
                      },
                      newCheckpointRepeat === option.value && styles.repeatModeButtonActive,
                    ]}
                    onPress={() => setNewCheckpointRepeat(option.value)}
                  >
                    <Text style={[styles.repeatModeButtonText, { color: theme.textPrimary }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {newCheckpointRepeat === "weekly" && (
                <View style={styles.repeatDaysRow}>
                  {WEEKDAY_OPTIONS.map((day) => (
                    <Pressable
                      key={`cp-${day.value}`}
                      style={[
                        styles.repeatDayChip,
                        {
                          borderColor: theme.inputBorder,
                          backgroundColor: theme.inputBg,
                        },
                        newCheckpointRepeatDays.includes(day.value) && styles.repeatDayChipActive,
                      ]}
                      onPress={() => toggleWeekday(day.value, setNewCheckpointRepeatDays)}
                    >
                      <Text style={[styles.repeatDayChipText, { color: theme.textPrimary }]}>
                        {day.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {showAddCheckpointTimePicker && (
              <DateTimePicker
                value={newCheckpointTime}
                mode="time"
                display="default"
                onChange={onAddCheckpointTimeChanged}
              />
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel, { borderColor: theme.inputBorder }]}
                onPress={() => setAddCheckpointModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textPrimary }]}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSave, savingCrud && { opacity: 0.65 }]}
                onPress={() => void saveNewCheckpoint()}
                disabled={savingCrud}
              >
                <Text style={styles.modalSaveText}>حفظ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addTaskModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddTaskModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.modalCardBg, borderColor: theme.modalCardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>إضافة مهمة جديدة</Text>
            <Text style={[styles.modalTaskName, { color: theme.textSecondary }]} numberOfLines={2}>
              {addTaskCheckpointTarget?.name ?? ""}
            </Text>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>اسم المهمة</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: theme.inputBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  },
                ]}
                value={newTaskName}
                onChangeText={setNewTaskName}
                placeholder="مثال: جلسة ذكر"
                placeholderTextColor={theme.inputPlaceholder}
                textAlign="right"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>النقاط (اختياري)</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: theme.inputBorder,
                    backgroundColor: theme.inputBg,
                    color: theme.inputText,
                  },
                ]}
                value={newTaskPoints}
                onChangeText={setNewTaskPoints}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.inputPlaceholder}
                textAlign="right"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>نوع التكرار</Text>
              <View style={styles.repeatModeRow}>
                {REPEAT_MODE_OPTIONS.map((option) => (
                  <Pressable
                    key={`task-repeat-${option.value}`}
                    style={[
                      styles.repeatModeButton,
                      {
                        borderColor: theme.inputBorder,
                        backgroundColor: theme.inputBg,
                      },
                      newTaskRepeat === option.value && styles.repeatModeButtonActive,
                    ]}
                    onPress={() => setNewTaskRepeat(option.value)}
                  >
                    <Text style={[styles.repeatModeButtonText, { color: theme.textPrimary }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {newTaskRepeat === "weekly" && (
                <View style={styles.repeatDaysRow}>
                  {WEEKDAY_OPTIONS.map((day) => (
                    <Pressable
                      key={`task-${day.value}`}
                      style={[
                        styles.repeatDayChip,
                        {
                          borderColor: theme.inputBorder,
                          backgroundColor: theme.inputBg,
                        },
                        newTaskRepeatDays.includes(day.value) && styles.repeatDayChipActive,
                      ]}
                      onPress={() => toggleWeekday(day.value, setNewTaskRepeatDays)}
                    >
                      <Text style={[styles.repeatDayChipText, { color: theme.textPrimary }]}>
                        {day.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.modalHintRow}>
              <Text style={[styles.modalHintText, { color: theme.textMuted }]}>
                سيتم تعيين وقت المهمة تلقائياً من وقت المرحلة
              </Text>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancel, { borderColor: theme.inputBorder }]}
                onPress={() => {
                  setAddTaskModalVisible(false);
                  setAddTaskCheckpointTarget(null);
                }}
              >
                <Text style={[styles.modalCancelText, { color: theme.textPrimary }]}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSave, savingCrud && { opacity: 0.65 }]}
                onPress={() => void saveNewTask()}
                disabled={savingCrud}
              >
                <Text style={styles.modalSaveText}>حفظ</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={notificationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: theme.modalBackdrop }]}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.modalCardBg, borderColor: theme.modalCardBorder },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>إعدادات التنبيه</Text>
            <Text style={[styles.modalTaskName, { color: theme.textSecondary }]} numberOfLines={2}>
              {selectedNotificationTarget?.itemName ?? ""}
            </Text>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>تفعيل التنبيه</Text>
              <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
            </View>

            <View style={styles.modalRow}>
              <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>وقت التنبيه</Text>
              <Pressable
                style={[
                  styles.timeSelectButton,
                  { borderColor: theme.inputBorder, backgroundColor: theme.inputBg },
                ]}
                onPress={() => setShowTimePicker(true)}
                disabled={!notificationsEnabled}
              >
                <Text style={[styles.timeSelectText, { color: theme.inputText }]}>
                  {formatTimeByPreference(toHHmm(notificationTime), timeFormatPreference)}
                </Text>
              </Pressable>
            </View>

            {!isDefaultTaskModal && (
              <>
                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>عنوان التنبيه</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        borderColor: theme.inputBorder,
                        backgroundColor: theme.inputBg,
                        color: theme.inputText,
                      },
                    ]}
                    value={notificationTitle}
                    onChangeText={setNotificationTitle}
                    placeholder="تذكير: اسم المهمة"
                    placeholderTextColor={theme.inputPlaceholder}
                    textAlign="right"
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.textPrimary }]}>نص التنبيه</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      styles.modalInputMultiline,
                      {
                        borderColor: theme.inputBorder,
                        backgroundColor: theme.inputBg,
                        color: theme.inputText,
                      },
                    ]}
                    value={notificationText}
                    onChangeText={setNotificationText}
                    placeholder="حان وقت ..."
                    placeholderTextColor={theme.inputPlaceholder}
                    textAlign="right"
                    multiline
                  />
                </View>
              </>
            )}

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
                style={[styles.modalButton, styles.modalCancel, { borderColor: theme.inputBorder }]}
                onPress={() => {
                  setNotificationModalVisible(false);
                  setSelectedNotificationTarget(null);
                }}
              >
                <Text style={[styles.modalCancelText, { color: theme.textPrimary }]}>إلغاء</Text>
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
    paddingTop: 4,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "rgba(10,14,26,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  logo: {
    width: 86,
    height: 86,
  },
  topContentRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 5,
  },
  dayCardsRail: {
    width: "100%",
    height: DAY_CARD_RAIL_HEIGHT,
    maxHeight: DAY_CARD_RAIL_HEIGHT,
    overflow: "hidden",
  },
  dayCardsContainer: {
    paddingHorizontal: 2,
  },
  dayCardSeparator: {
    width: DAY_CARD_HORIZONTAL_SPACING,
  },
  dayCard: {
    width: DAY_CARD_PILL_WIDTH,
    height: DAY_CARD_PILL_HEIGHT,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingVertical: 3,
    paddingHorizontal: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "stretch",
    justifyContent: "center",
  },
  dayCardContent: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  dayCardPrayerDotsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 3,
  },
  dayCardPrayerDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  dayCardDay: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: FONTS.bold,
    lineHeight: 16,
    textAlign: "center",
  },
  dayCardDaySelected: {
    color: "#FFFFFF",
  },
  dayCardGregorianSmall: {
    color: "#94A3B8",
    fontSize: 8,
    lineHeight: 10,
    fontFamily: FONTS.regular,
    textAlign: "center",
  },
  dayCardGregorianSmallSelected: {
    color: "#E2E8F0",
  },
  dayCardPipe: {
    fontSize: 10,
    fontFamily: FONTS.semiBold,
    lineHeight: 12,
  },
  dayCardSelected: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  dayCardToday: {
    borderColor: "rgba(34,197,94,0.7)",
  },
  calendarHeader: {
    paddingBottom: 6,
    gap: 5,
  },
  countdownCard: {
    minHeight: 44,
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: "center",
  },
  countdownSummary: {
    paddingVertical: 2,
    paddingHorizontal: 2,
    gap: 1,
  },
  countdownLabelRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 5,
  },
  countdownValueRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 5,
    paddingBottom: 2,
  },
  countdownMetric: {
    flex: 1,
    minWidth: 0,
  },
  countdownStick: {
    width: 1,
    height: 14,
    alignSelf: "center",
  },
  countdownMetricLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 2,
    alignSelf: "stretch",
  },
  countdownInlineLabel: {
    fontSize: 9,
    fontFamily: FONTS.semiBold,
    textAlign: "right",
    flexShrink: 1,
    lineHeight: 11,
  },
  countdownInlineValue: {
    fontSize: 14,
    fontFamily: FONTS.bold,
    textAlign: "right",
    flexShrink: 1,
    alignSelf: "flex-end",
    lineHeight: 16,
  },
  topRow: {
    display: "flex",
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
    flex: 1,
    alignItems: "flex-end",
  },
  secondRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerActionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
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
    display: "flex",
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(99,102,241,0.16)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    maxWidth: "100%",
  },
  locationWrap: {
    display: "flex",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
  },
  locationActionButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  locationText: {
    flexGrow: 1,
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: FONTS.semiBold,
    textAlign: "right",
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
    fontFamily: FONTS.semiBold,
  },
  pointsCounterValue: {
    color: "#ECFDF5",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: FONTS.bold,
  },
  hijriDate: {
    color: "#E5E7EB",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: FONTS.bold,
    textAlign: "right",
  },
  gregorianDate: {
    color: "#9CA3AF",
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "right",
  },

  checkpointRow: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 22,
  },
  checkpointAddRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 1,
  },

  timelineCol: {
    width: 28,
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
    marginRight: 0,
  },
  timelineLineTop: {
    width: 2,
    minHeight: 8,
    flex: 0,
    borderRadius: 2,
  },
  timelineLineBottom: {
    width: 2,
    flex: 1,
    borderRadius: 2,
    marginTop: 4,
  },
  timelineDotOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineAddButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineAddStem: {
    width: 2,
    height: 10,
    borderRadius: 2,
    marginTop: 1,
  },

  contentCol: {
    flex: 1,
    gap: 10,
  },
  checkpointHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },

  headerPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    maxWidth: "100%",
  },
  headerInner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  headerIcon: { width: 18, alignItems: "center" },
  headerName: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: "#FFFFFF",
    flexShrink: 1,
    textAlign: "right",
  },
  headerTimeText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
    textAlign: "right",
  },
  headerPrayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },

  tasksContainer: {
    gap: 10,
    paddingTop: 8,
  },

  taskWrapper: {
    gap: 4,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  taskCard: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(150,150,150,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  taskContentContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
  },
  taskText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    fontFamily: FONTS.semiBold,
  },
  circleActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  circleActionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  circleActionDanger: {
    borderColor: "rgba(252,165,165,0.35)",
    backgroundColor: "rgba(252,165,165,0.08)",
  },
  circleActionRedirect: {
    borderColor: "rgba(191,219,254,0.35)",
    backgroundColor: "rgba(59,130,246,0.12)",
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
    borderRadius: 999,
    borderWidth: 1,
  },
  checkboxSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(150,150,150,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  checklistText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONTS.regular,
  },
  pointsBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pointsText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: FONTS.bold,
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
    fontFamily: FONTS.bold,
    textAlign: "right",
  },
  modalTaskName: {
    color: "#D1D5DB",
    fontSize: 14,
    fontFamily: FONTS.regular,
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
  repeatModeRow: {
    flexDirection: "row-reverse",
    gap: 8,
  },
  repeatModeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  repeatModeButtonActive: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  repeatModeButtonText: {
    color: "#E5E7EB",
    fontSize: 13,
    fontWeight: "600",
    fontFamily: FONTS.semiBold,
  },
  repeatDaysRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
  },
  repeatDayChip: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  repeatDayChipActive: {
    borderColor: "#818CF8",
    backgroundColor: "rgba(99,102,241,0.25)",
  },
  repeatDayChipText: {
    color: "#E5E7EB",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: FONTS.semiBold,
  },
  modalLabel: {
    color: "#E5E7EB",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: FONTS.semiBold,
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
    fontFamily: FONTS.semiBold,
  },
  modalActions: {
    marginTop: 6,
    flexDirection: "row-reverse",
    gap: 10,
  },
  modalHintRow: {
    marginTop: 2,
    marginBottom: 8,
  },
  modalHintText: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: "right",
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
    fontFamily: FONTS.semiBold,
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: FONTS.bold,
  },
});

