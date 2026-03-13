// db/queries.ts
import { getDb } from "./sqlite";
type ThemePreference = "light" | "dark";
export type PrayerAdhanSound = "default" | "adhan";
export type TimeFormatPreference = "system" | "12h" | "24h";

function normalizeArabicDayName(day: string): string {
  return day
    .trim()
    .replaceAll("أ", "ا")
    .replaceAll("إ", "ا")
    .replaceAll("آ", "ا")
    .replaceAll("ى", "ي");
}

function resolveTargetDate(targetDate?: Date | string) {
  if (targetDate instanceof Date && !Number.isNaN(targetDate.getTime())) {
    return targetDate;
  }

  if (typeof targetDate === "string") {
    const trimmed = targetDate.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]);
      const day = Number(match[3]);
      const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const fallbackParsed = new Date(trimmed);
    if (!Number.isNaN(fallbackParsed.getTime())) {
      return fallbackParsed;
    }
  }

  return new Date();
}

function toDateISO(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDayNamesForDate(targetDate?: Date | string) {
  const date = resolveTargetDate(targetDate);
  const weekdayAr = new Intl.DateTimeFormat("ar", { weekday: "long" }).format(date);
  const weekdayEn = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);

  const enToAr: Record<string, string> = {
    Sunday: "الأحد",
    Monday: "الاثنين",
    Tuesday: "الثلاثاء",
    Wednesday: "الأربعاء",
    Thursday: "الخميس",
    Friday: "الجمعة",
    Saturday: "السبت",
  };

  return {
    arabic: normalizeArabicDayName(weekdayAr),
    english: weekdayEn,
    mappedArabic: normalizeArabicDayName(enToAr[weekdayEn] ?? ""),
    dateISO: toDateISO(date),
  };
}

function parseRepeatDays(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }

  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("[")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed.map((v) => String(v)) : null;
  } catch {
    return null;
  }
}

function shouldRenderByRepeat(repeat: unknown, repeatDays: unknown, targetDate?: Date | string): boolean {
  const mode = String(repeat ?? "daily").toLowerCase();
  const dayInfo = getDayNamesForDate(targetDate);

  if (mode === "daily") return true;

  if (mode === "weekly") {
    const days = parseRepeatDays(repeatDays);
    if (!days || days.length === 0) return false;

    const normalized = days.map((d) => normalizeArabicDayName(d));
    return (
      normalized.includes(dayInfo.arabic) ||
      normalized.includes(dayInfo.mappedArabic) ||
      days.includes(dayInfo.english)
    );
  }

  if (mode === "certain_day" || mode === "certain day") {
    const value = Array.isArray(repeatDays) ? repeatDays[0] : String(repeatDays ?? "").trim();
    return value === dayInfo.dateISO;
  }

  return true;
}

export async function loadCheckpoints(targetDate?: Date | string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  const checkpoints = rows
    .map((r) => JSON.parse(r.doc))
    .filter((cp) => shouldRenderByRepeat(cp.repeat, cp.repeat_days, targetDate))
    .map((cp) => ({
      ...cp,
      tasks: (cp.tasks ?? []).filter((task: any) =>
        shouldRenderByRepeat(task.repeat, task.repeat_days, targetDate)
      ),
    }))
    .sort((a, b) => {
      const aOrder = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

  return checkpoints;
}

export async function loadAllCheckpointsRaw() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );
  return rows.map((row) => JSON.parse(row.doc));
}

export async function updateTaskNotificationSettings(params: {
  taskId: string;
  notifications: boolean;
  notificationTime: string;
  notificationTitle: string;
  notificationText: string;
  notificationSound: string;
}) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  for (const row of rows) {
    const cp = JSON.parse(row.doc);
    const tasks = cp.tasks ?? [];
    const index = tasks.findIndex((task: any) => task.id === params.taskId);
    if (index === -1) continue;

    const nextTask = {
      ...tasks[index],
      notifications: params.notifications,
      notification_time: params.notificationTime,
      notification_title: params.notificationTitle,
      notification_text: params.notificationText,
      notification_sound: params.notificationSound,
    };

    const nextCp = {
      ...cp,
      tasks: [...tasks.slice(0, index), nextTask, ...tasks.slice(index + 1)],
    };

    await db.runAsync(
      "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
      [nextCp.id, JSON.stringify(nextCp)]
    );

    return { checkpoint: nextCp, task: nextTask };
  }

  return null;
}

export async function updateCheckpointNotificationSettings(params: {
  checkpointId: string;
  notifications: boolean;
  notificationTime: string;
  notificationTitle: string;
  notificationText: string;
  notificationSound: string;
}) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  for (const row of rows) {
    const cp = JSON.parse(row.doc);
    if (cp.id !== params.checkpointId) continue;

    const nextCp = {
      ...cp,
      notifications: params.notifications,
      notification_time: params.notificationTime,
      notification_title: params.notificationTitle,
      notification_text: params.notificationText,
      notification_sound: params.notificationSound,
    };

    await db.runAsync(
      "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
      [nextCp.id, JSON.stringify(nextCp)]
    );

    return { checkpoint: nextCp };
  }

  return null;
}

export async function createCheckpoint(params: {
  name: string;
  time: string;
  repeat: "daily" | "weekly";
  repeatDays: string[];
}) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  const checkpoints = rows.map((r) => JSON.parse(r.doc));
  const maxOrder = checkpoints.reduce((max, cp) => {
    const value = typeof cp.order === "number" ? cp.order : -1;
    return value > max ? value : max;
  }, -1);

  const id = `cp_user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const normalizedName = String(params.name ?? "").trim();
  const normalizedTime = String(params.time ?? "").trim() || "08:00";
  const normalizedRepeat = params.repeat === "weekly" ? "weekly" : "daily";
  const normalizedRepeatDays =
    normalizedRepeat === "weekly"
      ? Array.from(
          new Set(
            (params.repeatDays ?? [])
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        )
      : [];

  const checkpoint = {
    id,
    type: "checkpoint",
    name: normalizedName || "مرحلة جديدة",
    time: normalizedTime,
    order: maxOrder + 1,
    locked: false,
    expanded: true,
    default: false,
    repeat: normalizedRepeat,
    repeat_days: normalizedRepeat === "weekly" ? normalizedRepeatDays : "",
    notifications: false,
    enable_disable_notifications: true,
    notification_time: normalizedTime,
    notification_title: "",
    notification_sound: "default",
    notification_text: "",
    color: "#38BDF8",
    icon: "star",
    image: "",
    redirect: "",
    tasks: [],
  };

  await db.runAsync(
    "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
    [checkpoint.id, JSON.stringify(checkpoint)]
  );

  return checkpoint;
}

export async function deleteCheckpoint(checkpointId: string) {
  const db = await getDb();
  const result = await db.runAsync("DELETE FROM checkpoints WHERE id = ?;", [checkpointId]);
  return result.changes > 0;
}

export async function createTaskInCheckpoint(params: {
  checkpointId: string;
  name: string;
  points?: number;
  repeat: "daily" | "weekly";
  repeatDays: string[];
}) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints WHERE id = ?;",
    [params.checkpointId]
  );
  if (!row) return null;

  const checkpoint = JSON.parse(row.doc);
  const tasks = checkpoint.tasks ?? [];
  const id = `t_user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const normalizedName = String(params.name ?? "").trim();
  const normalizedPoints = Number.isFinite(Number(params.points)) ? Number(params.points) : 0;
  const normalizedRepeat = params.repeat === "weekly" ? "weekly" : "daily";
  const normalizedRepeatDays =
    normalizedRepeat === "weekly"
      ? Array.from(
          new Set(
            (params.repeatDays ?? [])
              .map((value) => String(value).trim())
              .filter(Boolean)
          )
        )
      : [];

  const task = {
    id,
    type: "regular_task",
    name: normalizedName || "مهمة جديدة",
    done: false,
    points: Math.max(0, normalizedPoints),
    locked: false,
    default: false,
    repeat: normalizedRepeat,
    repeat_days: normalizedRepeat === "weekly" ? normalizedRepeatDays : "",
    notifications: false,
    enable_disable_notifications: true,
    notification_time: String(checkpoint.time || "08:00"),
    notification_title: "",
    notification_sound: "default",
    notification_text: "",
    icon: "star",
    image: "",
    redirect: "",
    checklist: [],
  };

  const nextCheckpoint = {
    ...checkpoint,
    tasks: [...tasks, task],
  };

  await db.runAsync(
    "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
    [nextCheckpoint.id, JSON.stringify(nextCheckpoint)]
  );

  return { checkpoint: nextCheckpoint, task };
}

export async function deleteTaskFromCheckpoint(params: {
  checkpointId: string;
  taskId: string;
}) {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints WHERE id = ?;",
    [params.checkpointId]
  );
  if (!row) return null;

  const checkpoint = JSON.parse(row.doc);
  const tasks = checkpoint.tasks ?? [];
  const nextTasks = tasks.filter((task: any) => task.id !== params.taskId);
  if (nextTasks.length === tasks.length) return null;

  const nextCheckpoint = {
    ...checkpoint,
    tasks: nextTasks,
  };

  await db.runAsync(
    "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
    [nextCheckpoint.id, JSON.stringify(nextCheckpoint)]
  );

  return { checkpoint: nextCheckpoint };
}

export async function getAppSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = ?;",
    [key]
  );
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);",
    [key, value]
  );
}

const THEME_PREF_KEY = "theme_preference";
const PRAYER_ADHAN_SOUND_KEY = "prayer_adhan_sound";
const NOTIF_SETUP_PROMPT_SEEN_KEY = "notif_setup_prompt_seen_v1";
const TIME_FORMAT_PREF_KEY = "time_format_preference";

export async function getThemePreference(): Promise<ThemePreference> {
  const raw = await getAppSetting(THEME_PREF_KEY);
  if (raw === "light" || raw === "dark") return raw;
  return "dark";
}

export async function setThemePreference(value: ThemePreference): Promise<void> {
  await setAppSetting(THEME_PREF_KEY, value);
}

export async function getPrayerAdhanSoundPreference(): Promise<PrayerAdhanSound> {
  const raw = await getAppSetting(PRAYER_ADHAN_SOUND_KEY);
  if (raw === "adhan" || raw === "default") return raw;
  return "default";
}

export async function setPrayerAdhanSoundPreference(value: PrayerAdhanSound): Promise<void> {
  await setAppSetting(PRAYER_ADHAN_SOUND_KEY, value);
}

export async function getTimeFormatPreference(): Promise<TimeFormatPreference> {
  const raw = await getAppSetting(TIME_FORMAT_PREF_KEY);
  if (raw === "system" || raw === "12h" || raw === "24h") return raw;
  return "system";
}

export async function setTimeFormatPreference(value: TimeFormatPreference): Promise<void> {
  await setAppSetting(TIME_FORMAT_PREF_KEY, value);
}

export async function hasSeenNotificationSetupPrompt(): Promise<boolean> {
  const raw = await getAppSetting(NOTIF_SETUP_PROMPT_SEEN_KEY);
  return raw === "1";
}

export async function setNotificationSetupPromptSeen(value: boolean): Promise<void> {
  await setAppSetting(NOTIF_SETUP_PROMPT_SEEN_KEY, value ? "1" : "0");
}
