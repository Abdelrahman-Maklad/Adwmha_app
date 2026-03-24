import * as Notifications from "expo-notifications";
import { getAppSetting, loadAllCheckpointsRaw, setAppSetting } from "../db/queries";
import { ensureScheduleNext48h } from "./checkpointNotificationScheduler";
import { scheduleTaskNotifications } from "./taskNotifications";

export const PATCH_NOTIFICATION_REBUILD_KEY = "notif_rebuild_required_patch_v1";

export async function rebuildNotificationsIfNeededAfterPatch(): Promise<boolean> {
  const pendingPatchVersion = await getAppSetting(PATCH_NOTIFICATION_REBUILD_KEY);
  if (!pendingPatchVersion) return false;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const checkpoints = await loadAllCheckpointsRaw();
  for (const checkpoint of checkpoints) {
    const tasks = Array.isArray(checkpoint?.tasks) ? checkpoint.tasks : [];
    for (const task of tasks) {
      if (!task?.notifications) continue;

      await scheduleTaskNotifications({
        taskId: String(task.id ?? ""),
        taskName: String(task.name ?? ""),
        repeat: String(task.repeat ?? "daily"),
        repeatDays: task.repeat_days ?? "",
        notificationTime: String(task.notification_time ?? checkpoint.time ?? "08:00"),
        notificationTitle: String(task.notification_title ?? ""),
        notificationText: String(task.notification_text ?? ""),
        notificationSound: String(task.notification_sound ?? "default"),
      });
    }
  }

  await ensureScheduleNext48h("checkpoint_settings_changed");
  await setAppSetting(PATCH_NOTIFICATION_REBUILD_KEY, "");
  return true;
}
