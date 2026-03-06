// db/sqlite.ts
import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;
let _dbOpenPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb() {
  if (_db) return _db;
  if (_dbOpenPromise) return _dbOpenPromise;

  _dbOpenPromise = (async () => {
    const db = await SQLite.openDatabaseAsync("adomha_v200001.db");

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checkpoints (
      id TEXT PRIMARY KEY NOT NULL,
      doc TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS adhkar_sets (
      _id TEXT PRIMARY KEY NOT NULL,
      doc TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS completion_state (
      item_id TEXT PRIMARY KEY NOT NULL,
      done INTEGER NOT NULL DEFAULT 0
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS daily_completion_state (
      day_key TEXT NOT NULL,
      item_id TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (day_key, item_id)
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS prayer_times_cache (
      cache_key TEXT PRIMARY KEY NOT NULL,
      date_key TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      method INTEGER NOT NULL,
      fajr TEXT NOT NULL,
      sunrise TEXT NOT NULL,
      dhuhr TEXT NOT NULL,
      asr TEXT NOT NULL,
      maghrib TEXT NOT NULL,
      isha TEXT NOT NULL,
      hijri_day TEXT,
      hijri_month_ar TEXT,
      hijri_year TEXT,
      hijri_weekday_ar TEXT,
      hijri_month_number TEXT,
      gregorian_day TEXT,
      gregorian_month_en TEXT,
      gregorian_weekday_en TEXT,
      updated_at INTEGER NOT NULL
    );
  `);

    const addColumnIfMissing = async (columnDef: string) => {
      try {
        await db.execAsync(`ALTER TABLE prayer_times_cache ADD COLUMN ${columnDef};`);
      } catch {}
    };

    await addColumnIfMissing("hijri_day TEXT");
    await addColumnIfMissing("hijri_month_ar TEXT");
    await addColumnIfMissing("hijri_year TEXT");
    await addColumnIfMissing("hijri_weekday_ar TEXT");
    await addColumnIfMissing("hijri_month_number TEXT");
    await addColumnIfMissing("gregorian_day TEXT");
    await addColumnIfMissing("gregorian_month_en TEXT");
    await addColumnIfMissing("gregorian_weekday_en TEXT");

    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_prayer_times_cache_date
    ON prayer_times_cache (date_key);
  `);

    await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_prayer_times_cache_loc_method
    ON prayer_times_cache (lat, lng, method);
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS prayer_times_cache_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

    _db = db;
    return db;
  })();

  try {
    return await _dbOpenPromise;
  } finally {
    _dbOpenPromise = null;
  }

}
