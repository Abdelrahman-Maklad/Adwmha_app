import React, { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";

import { seedIfEmpty } from "./db/seed";
import { loadCheckpoints } from "./db/queries";

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // dummy times for testing (replace with API later)
        const times = {
          fajr: "05:10",
          sunrise: "06:35",
          dhuhr: "12:10",
          asr: "15:25",
          maghrib: "17:55",
          isha: "19:15",
        };
        const lastThirdTime = "03:30";

        await seedIfEmpty(times, lastThirdTime);
        const cps = await loadCheckpoints();
        setData(cps);
      } catch (e: any) {
        setErr(e?.message ?? String(e));
      }
    })();
  }, []);

  if (err) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 18 }}>❌ Error</Text>
        <Text>{err}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Checkpoints ({data.length})
      </Text>

      <FlatList
        data={data}
        keyExtractor={(cp) => cp.id}
        renderItem={({ item: cp }) => (
          <View style={{ paddingVertical: 12, borderBottomWidth: 1 }}>
            <Text style={{ fontSize: 16 }}>
              {cp.name} — {cp.time} {cp.locked ? "🔒" : "🔓"} {cp.expanded ? "⬇️" : "➡️"}
            </Text>
            <Text style={{ opacity: 0.7 }}>
              notif: {String(cp.notifications)} | repeat: {cp.repeat_type} | icon: {cp.icon || "-"} | image: {cp.image ? "yes" : "no"}
            </Text>

            {(cp.tasks ?? []).map((t: any) => (
              <View key={t.id} style={{ paddingLeft: 12, marginTop: 8 }}>
                <Text>
                  • {t.name} ({t.type}) — {t.points} pts
                </Text>

                {(t.checklist ?? []).map((cl: any) => (
                  <Text key={cl.id} style={{ paddingLeft: 14, opacity: 0.9 }}>
                    - {cl.name} — {cl.points} pts
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}
      />
    </View>
  );
}