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

const DAY_TO_WEEKDAY: Record<string, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
  "الاحد": 1,
  "الأحد": 1,
  "الاثنين": 2,
  "الإثنين": 2,
  "الثلاثاء": 3,
  "الاربعاء": 4,
  "الأربعاء": 4,
  "الخميس": 5,
  "الجمعة": 6,
  "السبت": 7,
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

async function ensurePermissions() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
    });
  }

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

export async function cancelTaskNotifications(taskId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(
    (item) => String(item.content.data?.taskId ?? "") === String(taskId)
  );

  await Promise.all(
    toCancel.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export async function scheduleTaskNotifications(input: {
  taskId: string;
  taskName: string;
  checkpointName: string;
  repeat: string;
  repeatDays: unknown;
  notificationTime: string;
}) {
  const allowed = await ensurePermissions();
  if (!allowed) return false;

  const time = parseTimeToHourMinute(input.notificationTime);
  if (!time) return false;

  await cancelTaskNotifications(input.taskId);

  const repeat = String(input.repeat ?? "daily").toLowerCase() as RepeatMode;
  const repeatDays = parseRepeatDays(input.repeatDays);
  const content: Notifications.NotificationContentInput = {
    title: `تذكير: ${input.taskName}`,
    body: `حان وقت ${input.notification_text}`,
    sound: true,
    data: {
      taskId: input.taskId,
    },
  };

  if (repeat === "weekly") {
    const weekdays = Array.from(
      new Set(
        repeatDays
          .map((d) => DAY_TO_WEEKDAY[normalizeDayName(d)] ?? null)
          .filter((v): v is number => v !== null)
      )
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
