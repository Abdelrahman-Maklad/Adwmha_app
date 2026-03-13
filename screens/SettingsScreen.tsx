import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  getPrayerAdhanSoundPreference,
  getTimeFormatPreference,
  setNotificationSetupPromptSeen,
  getThemePreference,
  PrayerAdhanSound,
  TimeFormatPreference,
  setPrayerAdhanSoundPreference,
  setThemePreference,
  setTimeFormatPreference,
} from "../db/queries";
import { RootStackParamList } from "../navigation/types";
import { getThemeTokens, ThemePreference, resolveThemePreference } from "../constants/theme";
import { ensureScheduleNext48h } from "../services/checkpointNotificationScheduler";
import NotificationSetupModal from "../components/NotificationSetupModal";
import { openNotificationSettings } from "../utils/openNotificationSettings";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("dark");
  const [adhanSound, setAdhanSound] = useState<PrayerAdhanSound>("default");
  const [timeFormatPreference, setTimeFormatPreferenceState] =
    useState<TimeFormatPreference>("system");
  const [notificationSetupVisible, setNotificationSetupVisible] = useState(false);
  const resolvedTheme = resolveThemePreference(themePreference);
  const theme = getThemeTokens(resolvedTheme);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [pref, sound, timeFormat] = await Promise.all([
          getThemePreference(),
          getPrayerAdhanSoundPreference(),
          getTimeFormatPreference(),
        ]);
        if (!mounted) return;
        setThemePreferenceState(pref);
        setAdhanSound(sound);
        setTimeFormatPreferenceState(timeFormat);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.topBarBackground },
      headerTintColor: theme.textPrimary,
      headerTitleStyle: { color: theme.textPrimary },
    });
  }, [navigation, theme.textPrimary, theme.topBarBackground]);

  const onToggleTheme = async (enabled: boolean) => {
    const next: ThemePreference = enabled ? "light" : "dark";
    setThemePreferenceState(next);
    await setThemePreference(next);
  };

  const onSelectSound = async (next: PrayerAdhanSound) => {
    if (next === adhanSound) return;
    setAdhanSound(next);
    await setPrayerAdhanSoundPreference(next);
    await ensureScheduleNext48h("checkpoint_settings_changed");
  };

  const onSelectTimeFormat = async (next: TimeFormatPreference) => {
    if (next === timeFormatPreference) return;
    setTimeFormatPreferenceState(next);
    await setTimeFormatPreference(next);
  };

  const closeNotificationSetupModal = async () => {
    setNotificationSetupVisible(false);
    await setNotificationSetupPromptSeen(true);
  };

  const openSettingsFromModal = async () => {
    await openNotificationSettings();
    await closeNotificationSetupModal();
  };

  return (
    <ImageBackground
      source={theme.backgroundImage}
      style={[styles.screen, { backgroundColor: theme.screenBackground }]}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlayColor }]} />
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.dayCardBg, borderColor: theme.dayCardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Contact Us</Text>
          <Text style={[styles.value, { color: theme.textSecondary }]}>
            Email: adomha.info@gmail.com
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.dayCardBg, borderColor: theme.dayCardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Theme</Text>
            <Switch value={resolvedTheme === "light"} onValueChange={onToggleTheme} />
          </View>
          <Text style={[styles.value, { color: theme.textSecondary }]}>
            {resolvedTheme === "light" ? "Light mode" : "Dark mode"}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.dayCardBg, borderColor: theme.dayCardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Adhan Notification Sound
          </Text>
          <View style={styles.optionRow}>
            <Pressable
              style={[
                styles.optionButton,
                { borderColor: theme.dayCardBorder },
                adhanSound === "default" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectSound("default")}
            >
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>Default</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionButton,
                { borderColor: theme.dayCardBorder },
                adhanSound === "adhan" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectSound("adhan")}
            >
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>Adhan</Text>
            </Pressable>
          </View>
          <Text style={[styles.value, { color: theme.textMuted }]}>
            Applied to prayer checkpoint reminders only.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.dayCardBg, borderColor: theme.dayCardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Time Format</Text>
          <View style={styles.optionRow}>
            <Pressable
              style={[
                styles.optionButton,
                { borderColor: theme.dayCardBorder },
                timeFormatPreference === "system" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectTimeFormat("system")}
            >
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>System</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionButton,
                { borderColor: theme.dayCardBorder },
                timeFormatPreference === "24h" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectTimeFormat("24h")}
            >
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>24 Hour</Text>
            </Pressable>
            <Pressable
              style={[
                styles.optionButton,
                { borderColor: theme.dayCardBorder },
                timeFormatPreference === "12h" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectTimeFormat("12h")}
            >
              <Text style={[styles.optionText, { color: theme.textPrimary }]}>12 Hour</Text>
            </Pressable>
          </View>
          <Text style={[styles.value, { color: theme.textMuted }]}>
            System uses the device hour format unless you override it here.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.dayCardBg, borderColor: theme.dayCardBorder }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Notification Setup Help
          </Text>
          <Text style={[styles.value, { color: theme.textSecondary }]}>
            Open the guidance and activation steps for background notifications.
          </Text>
          <Pressable style={styles.actionButton} onPress={() => setNotificationSetupVisible(true)}>
            <Text style={styles.actionButtonText}>Open Guide</Text>
          </Pressable>
        </View>
      </View>
      <NotificationSetupModal
        visible={notificationSetupVisible}
        onClose={() => void closeNotificationSetupModal()}
        onOpenSettings={openSettingsFromModal}
        theme={theme}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  value: {
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButton: {
    marginTop: 4,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
