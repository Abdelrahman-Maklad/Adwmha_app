import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { fetchQuranByRouteParams } from "../db/quranRepository";
import { QuranAyahViewModel } from "../db/quranTypes";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "QuranReference">;

export default function QuranReferenceScreen({ route, navigation }: Props) {
  const { quran, titleAr } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ayat, setAyat] = useState<QuranAyahViewModel[]>([]);

  useEffect(() => {
    navigation.setOptions({
      title: titleAr || "عرض الآيات",
    });
  }, [navigation, titleAr]);

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

  const previewText = useMemo(() => {
    return ayat
      .map((item) => `${item.textTashkeel} (${item.ayahNumber})`)
      .join(" ");
  }, [ayat]);

  return (
    <ImageBackground
      source={require("../assets/islamic ornament background.png")}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.card}>
        {loading ? (
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
            <Text style={styles.previewText}>{previewText}</Text>
          </ScrollView>
        )}
      </View>
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
  card: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(15,23,42,0.85)",
    padding: 16,
    paddingBottom: 10,
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
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  previewContent: {
    paddingBottom: 18,
    paddingHorizontal: 2,
  },
  previewText: {
    color: "#E2E8F0",
    textAlign: "right",
    writingDirection: "rtl",
    fontSize: 22,
    lineHeight: 42,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
