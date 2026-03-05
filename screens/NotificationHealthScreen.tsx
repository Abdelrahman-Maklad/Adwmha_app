import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { FONT_FAMILY } from "../constants/fonts";

export default function NotificationHealthScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fix delayed notifications</Text>
      <Text style={styles.paragraph}>
        Android can delay reminders in Doze or battery saver modes even when scheduling is correct.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommended Android steps</Text>
        <Text style={styles.item}>1. Disable battery optimization for this app.</Text>
        <Text style={styles.item}>2. Remove this app from Sleeping/Deep sleeping apps lists.</Text>
        <Text style={styles.item}>3. Turn off aggressive OEM power management for this app.</Text>
        <Text style={styles.item}>4. Keep notifications allowed for the app and channel.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Exact alarms</Text>
        <Text style={styles.paragraph}>
          This build includes exact alarm permission in Android config, but behavior can still vary by
          Android version and device policy.
        </Text>
      </View>

      {Platform.OS !== "android" ? (
        <Text style={styles.paragraph}>This guidance is mainly for Android devices.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    backgroundColor: "#0A0E1A",
    flexGrow: 1,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 22,
    fontFamily: FONT_FAMILY.cairoBold,
  },
  paragraph: {
    color: "#CBD5E1",
    fontSize: 14,
    lineHeight: 22,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  item: {
    color: "#CBD5E1",
    fontSize: 14,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
});

