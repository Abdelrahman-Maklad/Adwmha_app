import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFonts } from "expo-font";
import { ensureAdhkarSeededAndGet } from "../db/adhkarRepository";
import { AdhkarSetDoc } from "../db/adhkarTypes";
import AdhkarCard from "../components/AdhkarCard";
import { RootStackParamList } from "../navigation/types";
import { FONT_FAMILY } from "../constants/fonts";

type Props = NativeStackScreenProps<RootStackParamList, "AdhkarDetails">;

export default function AdhkarDetailsScreen({ route, navigation }: Props) {
  const [doc, setDoc] = useState<AdhkarSetDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const [fontsLoaded, fontLoadError] = useFonts({
    [FONT_FAMILY.cairoRegular]: require("../assets/fonts/Cairo-Regular.ttf"),
    [FONT_FAMILY.cairoSemiBold]: require("../assets/fonts/Cairo-SemiBold.ttf"),
    [FONT_FAMILY.cairoBold]: require("../assets/fonts/Cairo-Bold.ttf"),
    [FONT_FAMILY.hafs]: require("../assets/fonts/Hafs-Font-v0.09.otf"),
  });
  const hasHafsFont = fontsLoaded && !fontLoadError;
  const fontReady = fontsLoaded || Boolean(fontLoadError);

  useEffect(() => {
    if (__DEV__ && fontLoadError) {
      console.warn("[AdhkarDetailsScreen] Hafs font failed to load; using Cairo fallback.", fontLoadError);
    }
  }, [fontLoadError]);

  useEffect(() => {
    navigation.setOptions({
      title: doc?.title_ar ?? "تفاصيل الأذكار",
    });
  }, [doc?.title_ar, navigation]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await ensureAdhkarSeededAndGet(route.params.setId);
        if (!mounted) return;

        if (!result) {
          setDoc(null);
          setError("لم يتم العثور على مجموعة الأذكار المطلوبة.");
          return;
        }

        setDoc(result);
        const nextCounts: Record<string, number> = {};
        result.items.forEach((item) => {
          nextCounts[item.id] = 0;
        });
        setCounts(nextCounts);
      } catch {
        if (mounted) {
          setError("حدث خطأ أثناء تحميل البيانات.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [route.params.setId]);

  const orderedItems = useMemo(() => {
    const items = doc?.items ?? [];
    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const priorityDiff = Number(a.item.priority ?? 0) - Number(b.item.priority ?? 0);
        if (priorityDiff !== 0) return priorityDiff;
        return a.index - b.index;
      })
      .map((entry) => entry.item);
  }, [doc?.items]);

  return (
    <ImageBackground
      source={require("../assets/islamic ornament background.png")}
      style={styles.screen}
      imageStyle={{ transform: [{ scale: 1.5 }, { translateX: -20 }] }}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay} />

      {loading || !fontReady ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E5E7EB" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={orderedItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const repeat = Math.max(0, Number(item.repeat) || 0);
            const currentCount = counts[item.id] ?? 0;
            const isCompleted = repeat <= 0 || currentCount >= repeat;
            const isQuran = item.content_type === "quran" && Boolean(item.quran);

            return (
            <AdhkarCard
              item={item}
              currentCount={currentCount}
              onCardPress={() =>
                setCounts((prev) => ({
                  ...prev,
                  [item.id]:
                    Math.max(0, prev[item.id] ?? 0) >= repeat
                      ? Math.max(0, prev[item.id] ?? 0)
                      : Math.max(0, prev[item.id] ?? 0) + 1,
                }))
              }
              isCompleted={isCompleted}
              isDisabled={isCompleted}
              isQuranContent={isQuran}
              quranAyahNumber={isQuran && item.quran?.mode === "single" ? item.quran?.ayah : undefined}
              hasHafsFont={hasHafsFont}
              onOpenQuran={
                isQuran
                  ? () => {
                      if (!item.quran) return;
                      navigation.navigate("QuranReference", {
                        titleAr: item.text_ar,
                        quran: {
                          surah: item.quran.surah,
                          mode: item.quran.mode,
                          ayah: item.quran.ayah,
                          from: item.quran.from,
                          to: item.quran.to,
                        },
                      });
                    }
                  : undefined
              }
            />
            );
          }}
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,26,0.82)",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 18,
    paddingBottom: 26,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    textAlign: "center",
    color: "#FCA5A5",
    fontSize: 16,
    fontFamily: FONT_FAMILY.cairoSemiBold,
    writingDirection: "rtl",
  },
});
