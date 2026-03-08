import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  getAppSetting,
  getPrayerAdhanSoundPreference,
  loadAllCheckpointsRaw,
  PrayerAdhanSound,
  setAppSetting,
} from "../db/queries";
import {
  FALLBACK_TIMES,
  fetchPrayerTimesForDate,
  getLastCachedLocation,
  getPrayerTimesWithoutLocation,
} from "./prayerTimes";

export type CheckpointRule = {
  checkpointId: string;
  name: string;
  repeat: string;
  repeatDays: string[];
  notificationsEnabled: boolean;
  notificationTime: string;
  notificationTitle: string;
  notificationText: string;
};

export type SchedulerSettings = {
  location: { latitude: number; longitude: number } | null;
  method: number;
  prayerAdhanSound: PrayerAdhanSound;
  checkpointRules: CheckpointRule[];
};

export type ScheduledCheckpointEvent = {
  checkpointId: string;
  name: string;
  fireDate: Date;
  fireAtUtcMs: number;
  title: string;
  body: string;
  sound: PrayerAdhanSound;
};

export type EnsureReason =
  | "startup"
  | "app_active"
  | "checkpoint_settings_changed"
  | "manual";

export type EnsureResult = {
  didRebuild: boolean;
  scheduledCount: number;
  reason: EnsureReason;
  lastPlannedLocalDay: string;
  settingsHash: string;
  permissionGranted: boolean;
  exactAlarmStatus: "granted" | "denied" | "unknown";
};

const PRAYER_CHANNEL_DEFAULT_ID = "prayer_default";
const PRAYER_CHANNEL_ADHAN_ID = "prayer_adhan";
const SCHEDULER_SCOPE = "checkpoint_48h_v1";
const METHOD_DEFAULT = 5;
const KEY_SCHEDULED_IDS = "notif_checkpoints_scheduled_ids_v1";
const KEY_LAST_PLANNED_DAY = "notif_checkpoints_last_planned_local_day_v1";
const KEY_SETTINGS_HASH = "notif_checkpoints_settings_hash_v1";
const KEY_PERMS_PROMPTED = "notif_permissions_prompted_v1";
const PRAYER_SOUND_CHECKPOINT_IDS = new Set([
  "cp_fajr",
  "cp_dhuhr",
  "cp_asr",
  "cp_maghrib",
  "cp_isha",
  "cp_lastthird",
]);
let pendingEnsureSchedulePromise: Promise<EnsureResult> | null = null;

function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function extractHHmm(value: string): string | null {
  const raw = String(value ?? "").trim();
  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toDateAtTime(date: Date, hhmm: string): Date {
  const parsed = extractHHmm(hhmm);
  if (!parsed) return new Date(date);
  const [h, m] = parsed.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    Number(h),
    Number(m),
    0,
    0
  );
}

function toMinutes(hhmm: string): number {
  const parsed = extractHHmm(hhmm);
  if (!parsed) return 0;
  const [h, m] = parsed.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(minutes: number): string {
  const normalized = ((Math.floor(minutes) % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function calculateLastThird(isha: string, fajr: string): string {
  const ishaMinutes = toMinutes(isha);
  const fajrMinutes = toMinutes(fajr);
  const nightDuration =
    fajrMinutes > ishaMinutes ? fajrMinutes - ishaMinutes : 24 * 60 - ishaMinutes + fajrMinutes;
  return fromMinutes(ishaMinutes + (2 * nightDuration) / 3);
}

function parseRepeatDays(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [trimmed];
}

function normalizeArabicDay(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("Ø£", "Ø§")
    .replaceAll("Ø¥", "Ø§")
    .replaceAll("Ø¢", "Ø§")
    .replaceAll("Ù‰", "ÙŠ");
}

function getEnglishWeekday(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

function getArabicWeekday(date: Date): string {
  return normalizeArabicDay(new Intl.DateTimeFormat("ar", { weekday: "long" }).format(date));
}

function isWeeklyMatch(date: Date, repeatDays: string[]): boolean {
  if (repeatDays.length === 0) return false;
  const english = getEnglishWeekday(date);
  const arabic = getArabicWeekday(date);
  const normalized = repeatDays.map((day) => normalizeArabicDay(String(day)));
  return repeatDays.includes(english) || normalized.includes(arabic);
}

function isCertainDayMatch(date: Date, repeatDays: string[]): boolean {
  const dayKey = toLocalDayKey(date);
  const first = String(repeatDays[0] ?? "").trim();
  return first === dayKey;
}

function shouldScheduleRuleOnDate(rule: CheckpointRule, date: Date): boolean {
  const mode = String(rule.repeat ?? "daily").toLowerCase();
  if (mode === "daily") return true;
  if (mode === "weekly") return isWeeklyMatch(date, rule.repeatDays);
  if (mode === "certain_day" || mode === "certain day") {
    return isCertainDayMatch(date, rule.repeatDays);
  }
  return true;
}

function normalizeText(value: string, fallback: string): string {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

function buildSettingsHash(settings: SchedulerSettings): string {
  const normalizedRules = [...settings.checkpointRules]
    .sort((a, b) => a.checkpointId.localeCompare(b.checkpointId))
    .map((rule) => ({
      id: rule.checkpointId,
      n: rule.notificationsEnabled,
      r: rule.repeat,
      rd: [...rule.repeatDays].sort(),
      t: rule.notificationTime,
      ti: rule.notificationTitle,
      tx: rule.notificationText,
    }));

  return JSON.stringify({
    location: settings.location
      ? {
          lat: Number(settings.location.latitude.toFixed(6)),
          lng: Number(settings.location.longitude.toFixed(6)),
        }
      : null,
    method: settings.method,
    prayerAdhanSound: settings.prayerAdhanSound,
    rules: normalizedRules,
  });
}

async function loadScheduledIds(): Promise<string[]> {
  const raw = await getAppSetting(KEY_SCHEDULED_IDS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

async function saveScheduledIds(ids: string[]) {
  await setAppSetting(KEY_SCHEDULED_IDS, JSON.stringify(ids));
}

async function getSchedulerSettings(): Promise<SchedulerSettings> {
  const [allCheckpoints, lastLocation, prayerAdhanSound] = await Promise.all([
    loadAllCheckpointsRaw(),
    getLastCachedLocation(),
    getPrayerAdhanSoundPreference(),
  ]);

  const checkpointRules: CheckpointRule[] = allCheckpoints.map((cp: any) => ({
    checkpointId: String(cp.id ?? ""),
    name: String(cp.name ?? ""),
    repeat: String(cp.repeat ?? "daily"),
    repeatDays: parseRepeatDays(cp.repeat_days),
    notificationsEnabled: Boolean(cp.notifications),
    notificationTime: String(cp.notification_time ?? cp.time ?? "08:00"),
    notificationTitle: String(cp.notification_title ?? ""),
    notificationText: String(cp.notification_text ?? ""),
  }));

  return {
    location: lastLocation ? { latitude: lastLocation.lat, longitude: lastLocation.lng } : null,
    method: METHOD_DEFAULT,
    prayerAdhanSound,
    checkpointRules,
  };
}

async function getPrayerTimesByDay(date: Date, settings: SchedulerSettings) {
  const dayKey = toLocalDayKey(date);
  const fetched = settings.location
    ? await fetchPrayerTimesForDate(
        settings.location.latitude,
        settings.location.longitude,
        dayKey,
        settings.method
      )
    : await getPrayerTimesWithoutLocation(dayKey, settings.method);

  return fetched ?? FALLBACK_TIMES;
}

function getCheckpointFireDate(rule: CheckpointRule, date: Date, prayerTimesById: Record<string, Date>): Date {
  const prayerMapped = prayerTimesById[rule.checkpointId];
  if (prayerMapped) return prayerMapped;
  return toDateAtTime(date, rule.notificationTime);
}

function getTwoDayCandidates(now: Date): Date[] {
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const candidates = [current];
  for (let i = 1; i <= 3; i += 1) {
    const next = new Date(current);
    next.setDate(current.getDate() + i);
    candidates.push(next);
  }
  return candidates;
}

async function getExactAlarmStatus(): Promise<"granted" | "denied" | "unknown"> {
  if (Platform.OS !== "android") return "unknown";
  try {
    const permissions = (await Notifications.getPermissionsAsync()) as any;
    const candidate =
      permissions?.android?.canScheduleExactAlarms ??
      permissions?.canScheduleExactAlarms ??
      permissions?.android?.exactAlarm;
    if (candidate === true) return "granted";
    if (candidate === false) return "denied";
    return "unknown";
  } catch {
    return "unknown";
  }
}

export async function ensurePrayerChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_DEFAULT_ID, {
    name: "Prayer reminders",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });

  // If custom adhan sound is unavailable on the device, Android falls back to default.
  await Notifications.setNotificationChannelAsync(PRAYER_CHANNEL_ADHAN_ID, {
    name: "Prayer reminders (Adhan)",
    importance: Notifications.AndroidImportance.MAX,
    sound: "adhan.wav",
    vibrationPattern: [0, 250, 250, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

export async function requestNotifPermissions(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return { granted: true, canAskAgain: Boolean(current.canAskAgain) };
  }

  const requested = await Notifications.requestPermissionsAsync();
  await setAppSetting(KEY_PERMS_PROMPTED, "1");
  return { granted: requested.granted, canAskAgain: Boolean(requested.canAskAgain) };
}

export async function buildNext48hSchedule(
  now: Date,
  settings: SchedulerSettings
): Promise<ScheduledCheckpointEvent[]> {
  const windowStart = now.getTime();
  const windowEnd = now.getTime() + 48 * 60 * 60 * 1000;
  const rules = settings.checkpointRules.filter((rule) => rule.notificationsEnabled);
  const candidates = getTwoDayCandidates(now);
  const events: ScheduledCheckpointEvent[] = [];

  for (const day of candidates) {
    const dayTimes = await getPrayerTimesByDay(day, settings);
    const dayPrayerTimesById: Record<string, Date> = {
      cp_fajr: toDateAtTime(day, dayTimes.fajr),
      cp_sunrise: toDateAtTime(day, dayTimes.sunrise),
      cp_dhuhr: toDateAtTime(day, dayTimes.dhuhr),
      cp_asr: toDateAtTime(day, dayTimes.asr),
      cp_maghrib: toDateAtTime(day, dayTimes.maghrib),
      cp_isha: toDateAtTime(day, dayTimes.isha),
      cp_lastthird: toDateAtTime(day, calculateLastThird(dayTimes.isha, dayTimes.fajr)),
    };

    for (const rule of rules) {
      if (!shouldScheduleRuleOnDate(rule, day)) continue;

      const fireDate = getCheckpointFireDate(rule, day, dayPrayerTimesById);
      const fireAtUtcMs = fireDate.getTime();
      if (fireAtUtcMs <= windowStart || fireAtUtcMs > windowEnd) continue;

      events.push({
        checkpointId: rule.checkpointId,
        name: rule.name,
        fireDate,
        fireAtUtcMs,
        title: normalizeText(rule.notificationTitle, `ØªØ°ÙƒÙŠØ±: ${rule.name}`),
        body: normalizeText(rule.notificationText, `Ø­Ø§Ù† ÙˆÙ‚Øª ${rule.name}`),
        sound:
          PRAYER_SOUND_CHECKPOINT_IDS.has(rule.checkpointId) && settings.prayerAdhanSound === "adhan"
            ? "adhan"
            : "default",
      });
    }
  }

  events.sort((a, b) => a.fireAtUtcMs - b.fireAtUtcMs);
  return events;
}

export async function cancelScheduled(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map(async (id) => {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    })
  );
}

async function scheduleEvents(events: ScheduledCheckpointEvent[]): Promise<string[]> {
  const ids: string[] = [];
  for (const event of events) {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: event.title,
        body: event.body,
        sound: event.sound === "adhan" ? "adhan.wav" : "default",
        data: {
          scope: SCHEDULER_SCOPE,
          checkpointId: event.checkpointId,
          fireAtUtcMs: event.fireAtUtcMs,
        },
        ...(Platform.OS === "android"
          ? {
              channelId:
                event.sound === "adhan" ? PRAYER_CHANNEL_ADHAN_ID : PRAYER_CHANNEL_DEFAULT_ID,
            }
          : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(event.fireAtUtcMs),
      },
    });
    ids.push(identifier);
  }
  return ids;
}

async function runEnsureScheduleNext48h(reason: EnsureReason): Promise<EnsureResult> {
  await ensurePrayerChannel();

  const currentPermissions = await Notifications.getPermissionsAsync();
  let granted = currentPermissions.granted;
  if (!granted) {
    const prompted = await getAppSetting(KEY_PERMS_PROMPTED);
    if (prompted !== "1") {
      const requested = await requestNotifPermissions();
      granted = requested.granted;
    }
  }

  const settings = await getSchedulerSettings();
  const settingsHash = buildSettingsHash(settings);
  const lastPlannedLocalDay = toLocalDayKey(new Date());
  const exactAlarmStatus = await getExactAlarmStatus();

  if (!granted) {
    return {
      didRebuild: false,
      scheduledCount: 0,
      reason,
      lastPlannedLocalDay,
      settingsHash,
      permissionGranted: false,
      exactAlarmStatus,
    };
  }

  const [savedIds, savedDay, savedHash, allScheduled] = await Promise.all([
    loadScheduledIds(),
    getAppSetting(KEY_LAST_PLANNED_DAY),
    getAppSetting(KEY_SETTINGS_HASH),
    Notifications.getAllScheduledNotificationsAsync(),
  ]);

  const scheduledIdSet = new Set(allScheduled.map((item) => item.identifier));
  const missingAnySavedId = savedIds.some((id) => !scheduledIdSet.has(id));
  const shouldRebuild =
    savedDay !== lastPlannedLocalDay || savedHash !== settingsHash || missingAnySavedId;

  if (!shouldRebuild) {
    return {
      didRebuild: false,
      scheduledCount: savedIds.length,
      reason,
      lastPlannedLocalDay,
      settingsHash,
      permissionGranted: true,
      exactAlarmStatus,
    };
  }

  await cancelScheduled(savedIds);
  const events = await buildNext48hSchedule(new Date(), settings);
  const nextIds = await scheduleEvents(events);

  await Promise.all([
    saveScheduledIds(nextIds),
    setAppSetting(KEY_LAST_PLANNED_DAY, lastPlannedLocalDay),
    setAppSetting(KEY_SETTINGS_HASH, settingsHash),
  ]);

  return {
    didRebuild: true,
    scheduledCount: nextIds.length,
    reason,
    lastPlannedLocalDay,
    settingsHash,
    permissionGranted: true,
    exactAlarmStatus,
  };
}

export async function ensureScheduleNext48h(reason: EnsureReason): Promise<EnsureResult> {
  if (pendingEnsureSchedulePromise) {
    return pendingEnsureSchedulePromise;
  }

  pendingEnsureSchedulePromise = runEnsureScheduleNext48h(reason).finally(() => {
    pendingEnsureSchedulePromise = null;
  });

  return pendingEnsureSchedulePromise;
}

