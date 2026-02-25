// db/sqlite.ts
import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync("adomha_v1.db");

  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY NOT NULL,
      doc TEXT NOT NULL
    );
  `);

  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS completion_state (
      item_id TEXT PRIMARY KEY NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );
  `);

  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_completion_state (
      day_key TEXT NOT NULL,
      item_id TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day_key, item_id)
    );
  `);

  return _db;
}
