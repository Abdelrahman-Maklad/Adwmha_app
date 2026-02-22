// db/sqlite.ts
import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  if (_db) return _db;

  _db = await SQLite.openDatabaseAsync("adomha.db");

  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY NOT NULL,
      doc TEXT NOT NULL
    );
  `);

  return _db;
}