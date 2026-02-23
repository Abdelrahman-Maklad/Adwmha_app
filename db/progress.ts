import { getDb } from "./sqlite";

export async function loadCompletionState(): Promise<Record<string, boolean>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ item_id: string; done: number }>(
    "SELECT item_id, done FROM completion_state;"
  );

  return rows.reduce<Record<string, boolean>>((acc, row) => {
    acc[row.item_id] = row.done === 1;
    return acc;
  }, {});
}

export async function saveCompletionState(itemId: string, done: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO completion_state (item_id, done) VALUES (?, ?);",
    [itemId, done ? 1 : 0]
  );
}
