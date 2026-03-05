// App.tsx
import React, { useEffect } from "react";
import { Alert, AppState } from "react-native";
import RootNavigator from "./navigation/RootNavigator";
import {
  ensureScheduleNext48h,
  requestNotifPermissions,
} from "./services/checkpointNotificationScheduler";

export default function App() {
  useEffect(() => {
    void (async () => {
      const permission = await requestNotifPermissions();
      if (!permission.granted) {
        Alert.alert(
          "Notifications disabled",
          "Prayer reminders will not fire until notification permission is enabled."
        );
      }
    })();
    void ensureScheduleNext48h("startup");

    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        void ensureScheduleNext48h("app_active");
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return <RootNavigator />;
}
