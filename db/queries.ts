// db/queries.ts
import { getDb } from "./sqlite";

export async function loadCheckpoints() {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints ORDER BY id;"
  );
  return rows.map((r) => JSON.parse(r.doc));
}