import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { FONT_FAMILY, resolveArabicTextFont } from "../constants/fonts";
import { fetchQuranByRouteParams } from "../db/quranRepository";
import { RootStackParamList } from "../navigation/types";
import { getThemePreference } from "../db/queries";
import { getThemeTokens, resolveThemePreference, ThemePreference } from "../constants/theme";

type Props = NativeStackScreenProps<RootStackParamList, "QuranReference">;

export default function QuranReferenceScreen({ route, navigation }: Props) {
  const { quran, titleAr } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [surahText, setSurahText] = useState("");
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("dark");
  const resolvedTheme = resolveThemePreference(themePreference);
  const theme = getThemeTokens(resolvedTheme);

  const [fontsLoaded, fontLoadError] = useFonts({
    [FONT_FAMILY.cairoRegular]: require("../assets/fonts/Cairo-Regular.ttf"),
    [FONT_FAMILY.hafs]: require("../assets/fonts/Hafs-Font-v0.09.otf"),
  });

  const hasHafsFont = fontsLoaded && !fontLoadError;
  const fontReady = fontsLoaded || Boolean(fontLoadError);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const pref = await getThemePreference();
        if (mounted) setThemePreferenceState(pref);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    navigation.setOptions({
      title: titleAr || "عرض الآيات",
      headerStyle: { backgroundColor: theme.topBarBackground },
      headerTintColor: theme.textPrimary,
      headerTitleStyle: { color: theme.textPrimary },
    });
  }, [navigation, titleAr, theme.textPrimary, theme.topBarBackground]);

  useEffect(() => {
    if (__DEV__ && fontLoadError) {
      console.warn("[QuranReferenceScreen] Hafs font failed to load; using Cairo fallback.", fontLoadError);
    }
  }, [fontLoadError]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const text = await fetchQuranByRouteParams(quran);
        if (!active) return;

        setSurahText(text);
      } catch (e) {
        if (!active) return;
        if (__DEV__) {
          console.warn("[QuranReferenceScreen] Failed to load surah text:", e);
        }
        setSurahText("");
        setError("تعذر تحميل النص القرآني المحلي.");
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [quran]);

  const verseFontFamily = useMemo(() => resolveArabicTextFont(true, hasHafsFont), [hasHafsFont]);
  const trimmedSurahText = useMemo(() => surahText.trim(), [surahText]);

  return (
    <ImageBackground
      source={theme.backgroundImage}
      style={[styles.screen, { backgroundColor: theme.screenBackground }]}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { backgroundColor: theme.overlayColor }]} />

      {!fontReady || loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.textPrimary} />
          <Text style={[styles.stateText, { color: theme.textSecondary }]}>جاري تحميل الآيات...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={[styles.errorText, { color: "#DC2626" }]}>{error}</Text>
        </View>
      ) : !trimmedSurahText ? (
        <View style={styles.centerState}>
          <Text style={[styles.stateText, { color: theme.textSecondary }]}>لا يوجد نص قرآني مطابق للمعايير المحددة.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.previewContent}>
          <Text style={[styles.previewText, { fontFamily: verseFontFamily, color: theme.textSecondary }]}>
            {trimmedSurahText}
          </Text>
        </ScrollView>
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  previewContent: {
    flexGrow: 1,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  previewText: {
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 25,
    lineHeight: 42,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
});
