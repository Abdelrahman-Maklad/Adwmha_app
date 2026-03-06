import React, { useEffect, useState } from "react";
import { ImageBackground, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  getPrayerAdhanSoundPreference,
  getThemePreference,
  PrayerAdhanSound,
  setPrayerAdhanSoundPreference,
  setThemePreference,
} from "../db/queries";
import { RootStackParamList } from "../navigation/types";
import { getThemeTokens, ThemePreference, resolveThemePreference } from "../constants/theme";
import { ensureScheduleNext48h } from "../services/checkpointNotificationScheduler";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export default function SettingsScreen({ navigation }: Props) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("dark");
  const [adhanSound, setAdhanSound] = useState<PrayerAdhanSound>("default");
  const resolvedTheme = resolveThemePreference(themePreference);
  const theme = getThemeTokens(resolvedTheme);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [pref, sound] = await Promise.all([
          getThemePreference(),
          getPrayerAdhanSoundPreference(),
        ]);
        if (!mounted) return;
        setThemePreferenceState(pref);
        setAdhanSound(sound);
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
          <Text style={[styles.value, { color: theme.textSecondary }]}>Email: support@example.com</Text>
          <Text style={[styles.value, { color: theme.textSecondary }]}>Phone: +20 100 000 0000</Text>
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
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Adhan Notification Sound</Text>
          <View style={styles.soundRow}>
            <Pressable
              style={[
                styles.soundOption,
                { borderColor: theme.dayCardBorder },
                adhanSound === "default" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectSound("default")}
            >
              <Text style={[styles.soundText, { color: theme.textPrimary }]}>Default</Text>
            </Pressable>
            <Pressable
              style={[
                styles.soundOption,
                { borderColor: theme.dayCardBorder },
                adhanSound === "adhan" && { backgroundColor: theme.dayCardSelectedBg },
              ]}
              onPress={() => void onSelectSound("adhan")}
            >
              <Text style={[styles.soundText, { color: theme.textPrimary }]}>Adhan</Text>
            </Pressable>
          </View>
          <Text style={[styles.value, { color: theme.textMuted }]}>
            Applied to prayer checkpoint reminders only.
          </Text>
        </View>
      </View>
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
  soundRow: {
    flexDirection: "row",
    gap: 8,
  },
  soundOption: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  soundText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
