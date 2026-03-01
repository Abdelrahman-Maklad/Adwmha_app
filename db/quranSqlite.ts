import * as SQLite from "expo-sqlite";

const QURAN_DB_NAME = "quran.db";
const QURAN_DB_ASSET_ID = require("../assets/databases/quran.db");

let _quranDb: SQLite.SQLiteDatabase | null = null;
let _quranDbOpenPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getQuranDb() {
  if (_quranDb) return _quranDb;
  if (_quranDbOpenPromise) return _quranDbOpenPromise;

  _quranDbOpenPromise = (async () => {
    try {
      await SQLite.importDatabaseFromAssetAsync(QURAN_DB_NAME, {
        assetId: QURAN_DB_ASSET_ID,
        forceOverwrite: false,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn("[quranSqlite] Failed to import bundled quran.db asset:", error);
      }
    }

    const db = await SQLite.openDatabaseAsync(QURAN_DB_NAME, { enableChangeListener: false });
    _quranDb = db;
    return db;
  })();

  try {
    return await _quranDbOpenPromise;
  } catch (error) {
    if (__DEV__) {
      console.warn("[quranSqlite] Failed to open quran.db:", error);
    }
    throw error;
  } finally {
    _quranDbOpenPromise = null;
  }
}
