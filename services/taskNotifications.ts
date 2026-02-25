import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type RepeatMode = "daily" | "weekly" | "certain_day" | "certain day";
type NotificationSound = "default" | string;
type EntityType = "task" | "checkpoint";
const CHANNEL_VERSION = "v3";

const DAY_TO_WEEKDAY: Record<string, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

function parseTimeToHourMinute(time: string): { hour: number; minute: number } | null {
  const [hh, mm] = String(time).split(":");
  const hour = Number(hh);
  const minute = Number(mm);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function parseRepeatDays(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)) : [];
    } catch {
      return [];
    }
  }
  return [trimmed];
}

function normalizeDayName(day: string): string {
  return day
    .toLowerCase()
    .trim()
    .replaceAll("أ", "ا")
    .replaceAll("إ", "ا")
    .replaceAll("آ", "ا")
    .replaceAll("ى", "ي");
}

function mapDayToWeekday(day: string): number | null {
  const normalized = normalizeDayName(day);
  if (DAY_TO_WEEKDAY[normalized]) return DAY_TO_WEEKDAY[normalized];

  if (normalized === "الاحد") return 1;
  if (normalized === "الاثنين") return 2;
  if (normalized === "الثلاثاء") return 3;
  if (normalized === "الاربعاء") return 4;
  if (normalized === "الخميس") return 5;
  if (normalized === "الجمعة") return 6;
  if (normalized === "السبت") return 7;

  return null;
}

function normalizeSound(sound?: string): NotificationSound {
  const value = String(sound ?? "").trim();
  if (!value || value.toLowerCase() === "default") return "default";
  if (!value.includes(".")) return `${value}.mp3`;
  return value;
}

function normalizeTitle(title: string | undefined, itemName: string): string {
  const value = String(title ?? "").trim();
  return value || `تذكير: ${itemName}`;
}

function normalizeText(text: string | undefined, itemName: string): string {
  const value = String(text ?? "").trim();
  return value || `حان وقت ${itemName}`;
}

function getAndroidChannelId(sound: NotificationSound): string {
  if (sound === "default") return `default_${CHANNEL_VERSION}`;
  const slug = sound.toLowerCase().replace(/[^a-z0-9_\-.]/g, "_");
  return `sound_${slug}_${CHANNEL_VERSION}`;
}

async function ensurePermissions() {
  const perms = await Notifications.getPermissionsAsync();
  if (perms.granted || perms.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return (
    requested.granted ||
    requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensureChannelForSound(sound: NotificationSound) {
  if (Platform.OS !== "android") return;

  const channelId = getAndroidChannelId(sound);
  await Notifications.setNotificationChannelAsync(channelId, {
    name: channelId,
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: sound === "default" ? "default" : sound,
  });
}

async function cancelByDataKey(dataKey: "taskId" | "checkpointId", id: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(
    (item) => String(item.content.data?.[dataKey] ?? "") === String(id)
  );

  await Promise.all(
    toCancel.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

async function scheduleForEntity(input: {
  entityType: EntityType;
  entityId: string;
  itemName: string;
  repeat: string;
  repeatDays: unknown;
  notificationTime: string;
  notificationTitle?: string;
  notificationText?: string;
  notificationSound?: string;
}) {
  const allowed = await ensurePermissions();
  if (!allowed) return false;

  const time = parseTimeToHourMinute(input.notificationTime);
  if (!time) return false;

  const dataKey = input.entityType === "task" ? "taskId" : "checkpointId";
  await cancelByDataKey(dataKey, input.entityId);

  const repeat = String(input.repeat ?? "daily").toLowerCase() as RepeatMode;
  const repeatDays = parseRepeatDays(input.repeatDays);
  const sound = normalizeSound(input.notificationSound);

  await ensureChannelForSound(sound);

  const content: Notifications.NotificationContentInput = {
    title: normalizeTitle(input.notificationTitle, input.itemName),
    body: normalizeText(input.notificationText, input.itemName),
    sound,
    data: {
      [dataKey]: input.entityId,
    },
  };

  if (Platform.OS === "android") {
    (content as Notifications.NotificationContentInput & { channelId?: string }).channelId =
      getAndroidChannelId(sound);
  }

  if (repeat === "weekly") {
    const weekdays = Array.from(
      new Set(repeatDays.map((d) => mapDayToWeekday(d)).filter((v): v is number => v !== null))
    );

    if (weekdays.length === 0) return false;

    await Promise.all(
      weekdays.map((weekday) =>
        Notifications.scheduleNotificationAsync({
          content,
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday,
            hour: time.hour,
            minute: time.minute,
          },
        })
      )
    );
    return true;
  }

  if (repeat === "certain_day" || repeat === "certain day") {
    const dateStr = repeatDays[0];
    if (!dateStr) return false;
    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return false;

    const date = new Date(year, month - 1, day, time.hour, time.minute, 0, 0);
    if (date.getTime() <= Date.now()) return false;

    await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
    return true;
  }

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.hour,
      minute: time.minute,
    },
  });
  return true;
}

export async function cancelTaskNotifications(taskId: string) {
  await cancelByDataKey("taskId", taskId);
}

export async function cancelCheckpointNotifications(checkpointId: string) {
  await cancelByDataKey("checkpointId", checkpointId);
}

export async function scheduleTaskNotifications(input: {
  taskId: string;
  taskName: string;
  repeat: string;
  repeatDays: unknown;
  notificationTime: string;
  notificationTitle?: string;
  notificationText?: string;
  notificationSound?: string;
}) {
  return scheduleForEntity({
    entityType: "task",
    entityId: input.taskId,
    itemName: input.taskName,
    repeat: input.repeat,
    repeatDays: input.repeatDays,
    notificationTime: input.notificationTime,
    notificationTitle: input.notificationTitle,
    notificationText: input.notificationText,
    notificationSound: input.notificationSound,
  });
}

export async function scheduleCheckpointNotifications(input: {
  checkpointId: string;
  checkpointName: string;
  repeat: string;
  repeatDays: unknown;
  notificationTime: string;
  notificationTitle?: string;
  notificationText?: string;
  notificationSound?: string;
}) {
  return scheduleForEntity({
    entityType: "checkpoint",
    entityId: input.checkpointId,
    itemName: input.checkpointName,
    repeat: input.repeat,
    repeatDays: input.repeatDays,
    notificationTime: input.notificationTime,
    notificationTitle: input.notificationTitle,
    notificationText: input.notificationText,
    notificationSound: input.notificationSound,
  });
}
