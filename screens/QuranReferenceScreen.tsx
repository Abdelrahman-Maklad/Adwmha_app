import React, { useEffect } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "QuranReference">;

export default function QuranReferenceScreen({ route, navigation }: Props) {
  const { quran, titleAr } = route.params;

  useEffect(() => {
    navigation.setOptions({
      title: titleAr || "Quran Placeholder",
    });
  }, [navigation, titleAr]);

  return (
    <ImageBackground
      source={require("../assets/islamic ornament background.png")}
      style={styles.screen}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <View style={styles.placeholderCard}>
        <Text style={styles.title}>Quran Screen Disabled</Text>
        <Text style={styles.meta}>Surah: {quran.surah}</Text>
        <Text style={styles.meta}>Mode: {quran.mode}</Text>
        <Text style={styles.body}>
          The package @moustafahelmi/react-native-quran-app has been temporarily removed for startup testing.
        </Text>
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
  placeholderCard: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(15,23,42,0.85)",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
  },
  meta: {
    color: "#E2E8F0",
    fontSize: 14,
    marginBottom: 4,
  },
  body: {
    color: "#CBD5E1",
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
});
