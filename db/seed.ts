// db/seed.ts
import { getDb } from "./sqlite";
import { buildDefaultCheckpoints } from "./defaultData";

const ORDER_BY_ID: Record<string, number> = {
  cp_fajr: 0,
  cp_sunrise: 1,
  cp_dhuhr: 2,
  cp_asr: 3,
  cp_maghrib: 4,
  cp_isha: 5,
  cp_lastthird: 6,
};

const PRAYER_CHECKPOINT_IDS = new Set([
  "cp_fajr",
  "cp_dhuhr",
  "cp_asr",
  "cp_maghrib",
  "cp_isha",
]);

function subtractOneMinute(hhmm: string): string {
  const match = String(hhmm ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return String(hhmm ?? "");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return String(hhmm ?? "");
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return String(hhmm ?? "");
  const total = (hour * 60 + minute - 1 + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function ensureRepeatFields(item: any) {
  if (!item.repeat) item.repeat = item.repeat_type ?? "daily";
  if (item.repeat_days === undefined) item.repeat_days = "";
}

function ensureTaskFields(task: any) {
  ensureRepeatFields(task);
  if (task.locked === undefined) task.locked = false;
  if (task.notification_title === undefined) task.notification_title = "";
}

function ensureCheckpointFields(cp: any) {
  ensureRepeatFields(cp);
  if (cp.notification_title === undefined) cp.notification_title = "";
}

function buildTaskNotificationCapabilityMap(defaultDocs: any[]) {
  const map = new Map<string, boolean>();
  for (const cp of defaultDocs ?? []) {
    for (const task of cp.tasks ?? []) {
      map.set(task.id, Boolean(task.enable_disable_notifications));
    }
  }
  return map;
}

function buildDefaultCheckpointMap(defaultDocs: any[]) {
  const map = new Map<string, any>();
  for (const cp of defaultDocs ?? []) {
    map.set(String(cp.id), cp);
  }
  return map;
}

function applyLatestTimesToCheckpoint(cp: any, times: any, lastThirdTime: string): boolean {
  const timeByCheckpointId: Record<string, string> = {
    cp_fajr: times.fajr,
    cp_sunrise: times.sunrise,
    cp_dhuhr: times.dhuhr,
    cp_asr: times.asr,
    cp_maghrib: times.maghrib,
    cp_isha: times.isha,
    cp_lastthird: lastThirdTime,
  };

  const nextTime = timeByCheckpointId[cp.id];
  if (!nextTime) return false;

  let changed = false;
  if (cp.time !== nextTime) {
    cp.time = nextTime;
    changed = true;
  }

  const nextNotificationTime = PRAYER_CHECKPOINT_IDS.has(String(cp.id))
    ? subtractOneMinute(nextTime)
    : nextTime;
  if (cp.notification_time !== nextNotificationTime) {
    cp.notification_time = nextNotificationTime;
    changed = true;
  }

  if (cp.notification_sound !== "default") {
    cp.notification_sound = "default";
    changed = true;
  }

  return changed;
}

function migrateCheckpointDoc(
  cp: any,
  taskNotifCapabilityMap: Map<string, boolean>,
  defaultCheckpoint: any | null
) {
  let changed = false;

  if (cp.order === undefined) {
    cp.order = ORDER_BY_ID[cp.id] ?? 999;
    changed = true;
  }

  const beforeRepeat = cp.repeat;
  const beforeRepeatDays = cp.repeat_days;
  const beforeNotificationTitle = cp.notification_title;
  const beforeNotificationSound = cp.notification_sound;
  ensureCheckpointFields(cp);
  cp.notification_sound = "default";
  if (
    beforeRepeat !== cp.repeat ||
    beforeRepeatDays !== cp.repeat_days ||
    beforeNotificationTitle !== cp.notification_title ||
    beforeNotificationSound !== cp.notification_sound
  ) {
    changed = true;
  }

  for (const task of cp.tasks ?? []) {
    const tRepeat = task.repeat;
    const tRepeatDays = task.repeat_days;
    const tLocked = task.locked;
    const tEnableDisableNotifications = task.enable_disable_notifications;
    const tNotificationTitle = task.notification_title;
    const tNotificationSound = task.notification_sound;
    ensureTaskFields(task);
    task.notification_sound = "default";
    if (taskNotifCapabilityMap.has(task.id)) {
      task.enable_disable_notifications = taskNotifCapabilityMap.get(task.id);
    }
    if (
      tRepeat !== task.repeat ||
      tRepeatDays !== task.repeat_days ||
      tLocked !== task.locked ||
      tEnableDisableNotifications !== task.enable_disable_notifications ||
      tNotificationTitle !== task.notification_title ||
      tNotificationSound !== task.notification_sound
    ) {
      changed = true;
    }
  }

  if (defaultCheckpoint?.tasks?.length) {
    const existingIds = new Set((cp.tasks ?? []).map((task: any) => String(task.id)));
    const missingDefaultTasks = defaultCheckpoint.tasks.filter(
      (task: any) => !existingIds.has(String(task.id))
    );
    if (missingDefaultTasks.length > 0) {
      cp.tasks = [...(cp.tasks ?? []), ...missingDefaultTasks];
      changed = true;
    }
  }

  if (cp.id === "cp_dhuhr") {
    const tasks = cp.tasks ?? [];
    const dhuhrTask = tasks.find((t: any) => t.id === "t_dhuhr_main");
    if (dhuhrTask) {
      const weeklyDays = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "السبت"];
      if (dhuhrTask.repeat !== "weekly") {
        dhuhrTask.repeat = "weekly";
        changed = true;
      }
      if (JSON.stringify(dhuhrTask.repeat_days) !== JSON.stringify(weeklyDays)) {
        dhuhrTask.repeat_days = weeklyDays;
        changed = true;
      }
    }

    if (!tasks.some((t: any) => t.id === "t_jumuah")) {
      tasks.splice(2, 0, {
        id: "t_jumuah",
        type: "main_task",
        name: "صلاة الجمعة",
        done: false,
        points: 4,
        default: true,
        repeat: "weekly",
        repeat_days: ["الجمعة"],
        locked: false,
        notifications: false,
        enable_disable_notifications: false,
        notification_time: "",
        notification_title: "",
        notification_sound: "default",
        notification_text: "",
        icon: "pray",
        image: "",
        redirect: "",
        checklist: [
          { id: "cl_jumuah_jama3a", name: "جماعة", done: false, points: 3, icon: "users", image: "", redirect: "" },
          { id: "cl_jumuah_waqt", name: "في الوقت", done: false, points: 3, icon: "clock", image: "", redirect: "" },
          { id: "cl_jumuah_athkar", name: "أذكار الصلاة", done: false, points: 2, icon: "heart", image: "", redirect: "" }
        ]
      });
      cp.tasks = tasks;
      changed = true;
    }
  }

  return { cp, changed };
}

async function migrateExistingCheckpoints(defaultDocs: any[]) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  if (rows.length === 0) return;
  const taskNotifCapabilityMap = buildTaskNotificationCapabilityMap(defaultDocs);
  const defaultCheckpointMap = buildDefaultCheckpointMap(defaultDocs);

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const parsed = JSON.parse(row.doc);
      const defaultCheckpoint = defaultCheckpointMap.get(String(parsed.id)) ?? null;
      const { cp, changed } = migrateCheckpointDoc(
        parsed,
        taskNotifCapabilityMap,
        defaultCheckpoint
      );
      if (!changed) continue;

      await db.runAsync(
        "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
        [cp.id, JSON.stringify(cp)]
      );
    }
  });
}

async function syncCheckpointTimes(times: any, lastThirdTime: string) {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints;"
  );

  if (rows.length === 0) return;

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const cp = JSON.parse(row.doc);
      const changed = applyLatestTimesToCheckpoint(cp, times, lastThirdTime);
      if (!changed) continue;

      await db.runAsync(
        "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
        [cp.id, JSON.stringify(cp)]
      );
    }
  });
}

export async function seedIfEmpty(times: any, lastThirdTime: string) {
  const db = await getDb();
  const defaultDocs = buildDefaultCheckpoints(times, lastThirdTime);

  const row = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM checkpoints;"
  );

  if ((row?.c ?? 0) > 0) {
    await migrateExistingCheckpoints(defaultDocs);
    await syncCheckpointTimes(times, lastThirdTime);
    return;
  }

  const docs = defaultDocs;

  await db.withTransactionAsync(async () => {
    for (const cp of docs) {
      await db.runAsync(
        "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
        [cp.id, JSON.stringify(cp)]
      );
    }
  });
}


