// App.tsx
import React, { useEffect, useState } from "react";
import { AppState } from "react-native";
import RootNavigator from "./navigation/RootNavigator";
import NotificationSetupModal from "./components/NotificationSetupModal";
import UpdateModal from "./components/UpdateModal";
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
import { rebuildNotificationsIfNeededAfterPatch } from "./services/notificationRebuilder";
import { useAppUpdate } from "./hooks/useAppUpdate";

export default function App() {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("dark");
  const [notificationSetupVisible, setNotificationSetupVisible] = useState(false);
  const { isVisible, updateInfo, runUpdateCheck, onUpdatePress, onLaterPress } = useAppUpdate();

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
      // Startup update-check is connected here by design.
      void runUpdateCheck();
      try {
        await rebuildNotificationsIfNeededAfterPatch();
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
  }, [runUpdateCheck]);

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
      <UpdateModal
        visible={isVisible}
        theme={theme}
        updateInfo={updateInfo}
        onUpdatePress={() => void onUpdatePress()}
        onLaterPress={onLaterPress}
      />
    </>
  );
}
