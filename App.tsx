// App.tsx
import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import RootNavigator from "./navigation/RootNavigator";
import NotificationSetupModal from "./components/NotificationSetupModal";
import {
  getThemePreference,
  hasSeenNotificationSetupPrompt,
  setNotificationSetupPromptSeen,
} from "./db/queries";
import { getThemeTokens, resolveThemePreference, ThemePreference } from "./constants/theme";
import { openNotificationSettings } from "./utils/openNotificationSettings";
import {
  ensureScheduleNext48h,
  requestNotifPermissions,
} from "./services/checkpointNotificationScheduler";

export default function App() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("dark");
  const [notificationSetupVisible, setNotificationSetupVisible] = useState(false);

  const resolvedTheme = resolveThemePreference(themePreference);
  const theme = getThemeTokens(resolvedTheme);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [_, pref, seen] = await Promise.all([
          requestNotifPermissions(),
          getThemePreference(),
          hasSeenNotificationSetupPrompt(),
        ]);
        if (!active) return;
        setThemePreferenceState(pref);
        if (!seen) {
          setTimeout(() => {
            if (active) setNotificationSetupVisible(true);
          }, 0);
        }
      } catch {}
      try {
        await ensureScheduleNext48h("startup");
      } catch {}
    })();

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void (async () => {
          try {
            const pref = await getThemePreference();
            if (active) setThemePreferenceState(pref);
          } catch {}
        })();
        void ensureScheduleNext48h("app_active");
      }
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const closePrompt = async () => {
    setNotificationSetupVisible(false);
    await setNotificationSetupPromptSeen(true);
  };

  const openSettingsFromPrompt = async () => {
    await openNotificationSettings();
    await closePrompt();
  };

  return (
    <>
      <RootNavigator />
      <NotificationSetupModal
        visible={notificationSetupVisible}
        theme={theme}
        onClose={() => void closePrompt()}
        onOpenSettings={openSettingsFromPrompt}
      />
    </>
  );
}
