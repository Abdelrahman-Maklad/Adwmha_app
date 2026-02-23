// db/queries.ts
import { getDb } from "./sqlite";

function normalizeArabicDayName(day: string): string {
  return day
    .trim()
    .replaceAll("أ", "ا")
    .replaceAll("إ", "ا")
    .replaceAll("آ", "ا")
    .replaceAll("ى", "ي");
}

function getTodayDayNames() {
  const date = new Date();
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
    dateISO: date.toISOString().slice(0, 10),
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

function shouldRenderByRepeat(repeat: unknown, repeatDays: unknown): boolean {
  const mode = String(repeat ?? "daily").toLowerCase();
  const today = getTodayDayNames();

  if (mode === "daily") return true;

  if (mode === "weekly") {
    const days = parseRepeatDays(repeatDays);
    if (!days || days.length === 0) return false;

    const normalized = days.map((d) => normalizeArabicDayName(d));
    return (
      normalized.includes(today.arabic) ||
      normalized.includes(today.mappedArabic) ||
      days.includes(today.english)
    );
  }

  if (mode === "certain_day" || mode === "certain day") {
    const value = Array.isArray(repeatDays) ? repeatDays[0] : String(repeatDays ?? "").trim();
    return value === today.dateISO;
  }

  return true;
}

export async function loadCheckpoints() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  const checkpoints = rows
    .map((r) => JSON.parse(r.doc))
    .filter((cp) => shouldRenderByRepeat(cp.repeat, cp.repeat_days))
    .map((cp) => ({
      ...cp,
      tasks: (cp.tasks ?? []).filter((task: any) =>
        shouldRenderByRepeat(task.repeat, task.repeat_days)
      ),
    }))
    .sort((a, b) => {
      const aOrder = typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder;
    });

  return checkpoints;
}

export async function updateTaskNotificationSettings(params: {
  taskId: string;
  notifications: boolean;
  notificationTime: string;
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
