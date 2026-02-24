import { getDb } from "./sqlite";

export async function loadCompletionStateByDay(
  dayKey: string
): Promise<Record<string, boolean>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ item_id: string; done: number }>(
    "SELECT item_id, done FROM daily_completion_state WHERE day_key = ?;",
    [dayKey]
  );

  return rows.reduce<Record<string, boolean>>((acc, row) => {
    acc[row.item_id] = row.done === 1;
    return acc;
  }, {});
}

export async function saveCompletionStateByDay(
  dayKey: string,
  itemId: string,
  done: boolean
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO daily_completion_state (day_key, item_id, done) VALUES (?, ?, ?);",
    [dayKey, itemId, done ? 1 : 0]
  );
}

export async function clearDayCompletionState(dayKey: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("DELETE FROM daily_completion_state WHERE day_key = ?;", [dayKey]);
}
