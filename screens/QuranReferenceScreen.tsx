import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { FONT_FAMILY, resolveArabicTextFont } from "../constants/fonts";
import { fetchQuranByRouteParams } from "../db/quranRepository";
import { QuranAyahViewModel } from "../db/quranTypes";
import { RootStackParamList } from "../navigation/types";
import { formatAyahMarker } from "../utils/ayahMarker";

type Props = NativeStackScreenProps<RootStackParamList, "QuranReference">;
const BASMALA_PLAIN = "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645";
const BASMALA_TASHKEEL =
  "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064e\u0647\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650";

function stripLeadingBasmala(text: string) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith(BASMALA_TASHKEEL)) return trimmed.slice(BASMALA_TASHKEEL.length).trim();
  if (trimmed.startsWith(BASMALA_PLAIN)) return trimmed.slice(BASMALA_PLAIN.length).trim();
  return trimmed;
}

export default function QuranReferenceScreen({ route, navigation }: Props) {
  const { quran, titleAr } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ayat, setAyat] = useState<QuranAyahViewModel[]>([]);

  const [fontsLoaded, fontLoadError] = useFonts({
    [FONT_FAMILY.cairoRegular]: require("../assets/fonts/Cairo-Regular.ttf"),
    [FONT_FAMILY.hafs]: require("../assets/fonts/Hafs-Font-v0.09.otf"),
  });

  const hasHafsFont = fontsLoaded && !fontLoadError;
  const fontReady = fontsLoaded || Boolean(fontLoadError);

  useEffect(() => {
    navigation.setOptions({
      title: titleAr || "عرض الآيات",
    });
  }, [navigation, titleAr]);

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

        const rows = await fetchQuranByRouteParams(quran);
        if (!active) return;

        setAyat(rows);
      } catch (e) {
        if (!active) return;
        if (__DEV__) {
          console.warn("[QuranReferenceScreen] Failed to load ayat:", e);
        }
        setAyat([]);
        setError("تعذر تحميل بيانات الآيات من قاعدة البيانات المحلية.");
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
  const showBasmalaHeader = useMemo(() => {
    if (quran.surah === 9 || ayat.length === 0) return false;
    const first = String(ayat[0]?.textTashkeel ?? "").trim();
    return first.startsWith(BASMALA_TASHKEEL) || first.startsWith(BASMALA_PLAIN);
  }, [ayat, quran.surah]);

  const renderedAyat = useMemo(() => {
    if (!showBasmalaHeader) return ayat;

    return ayat
      .map((item, index) => {
        if (index !== 0) return item;
        return {
          ...item,
          textTashkeel: stripLeadingBasmala(item.textTashkeel),
        };
      })
      .filter((item) => String(item.textTashkeel ?? "").trim().length > 0);
  }, [ayat, showBasmalaHeader]);

  const fullSurahPreview = useMemo(() => {
    return renderedAyat
      .map((item) => `${item.textTashkeel} ${formatAyahMarker(item.ayahNumber)}`)
      .join(" ");
  }, [renderedAyat]);

  return (
    <ImageBackground
      source={require("../assets/islamic ornament background-dark theme.png")}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      {!fontReady || loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#E5E7EB" />
            <Text style={styles.stateText}>جاري تحميل الآيات...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : ayat.length === 0 ? (
        <View style={styles.centerState}>
            <Text style={styles.stateText}>لا توجد آيات مطابقة للمعايير المحددة.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.previewContent}>
          {showBasmalaHeader && (
            <Text style={[styles.basmalaText, { fontFamily: verseFontFamily }]}>{BASMALA_TASHKEEL}</Text>
          )}
          <Text style={[styles.previewText, { fontFamily: verseFontFamily }]}>{fullSurahPreview}</Text>
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
    backgroundColor: "rgba(10,14,26,0.82)",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  errorText: {
    color: "#FCA5A5",
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
  basmalaText: {
    color: "#F8FAFC",
    textAlign: "center",
    writingDirection: "rtl",
    fontSize: 20,
    lineHeight: 48,
    marginBottom: 2,
  },
  previewText: {
    color: "#E2E8F0",
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 25,
    lineHeight: 42,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
});
