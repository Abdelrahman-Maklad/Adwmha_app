// db/seed.ts
import { getDb } from "./sqlite";
import { buildDefaultCheckpoints } from "./defaultData";

export async function seedIfEmpty(times: any, lastThirdTime: string) {
  const db = await getDb();

  const row = await db.getFirstAsync<{ c: number }>(
    "SELECT COUNT(*) as c FROM checkpoints;"
  );

  if ((row?.c ?? 0) > 0) return; // already seeded

  const docs = buildDefaultCheckpoints(times, lastThirdTime);

  await db.withTransactionAsync(async () => {
    for (const cp of docs) {
      await db.runAsync(
        "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
        [cp.id, JSON.stringify(cp)]
      );
    }
  });
}