import { Linking, Platform } from "react-native";

export async function openNotificationSettings(): Promise<boolean> {
  try {
    if (Platform.OS === "android" && typeof (Linking as any).sendIntent === "function") {
      try {
        await (Linking as any).sendIntent("android.settings.APP_NOTIFICATION_SETTINGS");
        return true;
      } catch {
        // Fallback below.
      }
    }

    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
