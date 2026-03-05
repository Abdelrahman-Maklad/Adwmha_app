import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Notifications from "expo-notifications";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { FONT_FAMILY } from "../constants/fonts";
import { RootStackParamList } from "../navigation/types";
import {
  ensureScheduleNext48h,
  getCheckpointSchedulerDebugSnapshot,
} from "../services/checkpointNotificationScheduler";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationDebug">;

export default function NotificationDebugScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snapshot, setSnapshot] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCheckpointSchedulerDebugSnapshot();
      setSnapshot(data);
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rebuildNow = async () => {
    setLoading(true);
    setError("");
    try {
      await ensureScheduleNext48h("debug_refresh");
      await load();
    } catch (e: any) {
      setError(String(e?.message ?? e ?? "Unknown error"));
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Notification Debug</Text>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionButton} onPress={() => void rebuildNow()}>
          <Text style={styles.actionText}>{loading ? "Refreshing..." : "Rebuild 48h schedule"}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={() => navigation.navigate("NotificationHealth")}>
          <Text style={styles.actionText}>Fix delayed notifications</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.actionButtonSecondary}
        onPress={async () => {
          await Notifications.cancelAllScheduledNotificationsAsync();
          await load();
        }}
      >
        <Text style={styles.actionText}>Cancel all scheduled (debug)</Text>
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!snapshot ? (
        <Text style={styles.textMuted}>No snapshot yet.</Text>
      ) : (
        <>
          <DebugItem label="Now (ISO)" value={snapshot.nowIso} />
          <DebugItem label="Timezone" value={snapshot.timezone} />
          <DebugItem label="Permission granted" value={String(snapshot.permissionGranted)} />
          <DebugItem label="Can ask again" value={String(snapshot.canAskAgain)} />
          <DebugItem label="Exact alarm status" value={String(snapshot.exactAlarmStatus)} />
          <DebugItem label="Prayer channel exists" value={String(snapshot.channelExists)} />
          <DebugItem
            label="Persisted plan day"
            value={snapshot.persisted?.lastPlannedLocalDay ?? ""}
          />
          <DebugItem label="Persisted ids count" value={String(snapshot.persisted?.idsCount ?? 0)} />
          <DebugItem label="Settings hash" value={snapshot.persisted?.settingsHash ?? ""} />

          <SectionTitle title="Today prayer dates" />
          <PreText value={JSON.stringify(snapshot.todayPrayer, null, 2)} />

          <SectionTitle title="Tomorrow prayer dates" />
          <PreText value={JSON.stringify(snapshot.tomorrowPrayer, null, 2)} />

          <SectionTitle title="Built 48h events" />
          <PreText value={JSON.stringify(snapshot.events, null, 2)} />

          <SectionTitle title="OS scheduled notifications" />
          <PreText value={JSON.stringify(snapshot.scheduled, null, 2)} />
        </>
      )}
    </ScrollView>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.itemRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function PreText({ value }: { value: string }) {
  return <Text style={styles.pre}>{value}</Text>;
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 10,
    backgroundColor: "#0A0E1A",
    flexGrow: 1,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 22,
    fontFamily: FONT_FAMILY.cairoBold,
  },
  sectionTitle: {
    color: "#E2E8F0",
    fontSize: 16,
    marginTop: 8,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  itemRow: {
    gap: 2,
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
  value: {
    color: "#E2E8F0",
    fontSize: 13,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  textMuted: {
    color: "#94A3B8",
    fontSize: 13,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  pre: {
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.cairoRegular,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  error: {
    color: "#FCA5A5",
    fontSize: 13,
    fontFamily: FONT_FAMILY.cairoRegular,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(191,219,254,0.45)",
    backgroundColor: "rgba(59,130,246,0.12)",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  actionButtonSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(248,113,113,0.45)",
    backgroundColor: "rgba(127,29,29,0.2)",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  actionText: {
    color: "#DBEAFE",
    fontSize: 12,
    textAlign: "center",
    fontFamily: FONT_FAMILY.cairoSemiBold,
  },
});

