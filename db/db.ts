// db/db.ts
import * as SQLite from 'expo-sqlite';
import { checkpointSchema } from './schema';
import { createRxDatabase, addRxPlugin } from "rxdb";
import { RxDBDevModePlugin } from "rxdb/plugins/dev-mode";
import * as Crypto from "expo-crypto";
// Trial (free) SQLite storage:
import { getRxStorageSQLiteTrial, getSQLiteBasicsExpoSQLiteAsync } from 'rxdb/plugins/storage-sqlite';

let _dbPromise: Promise<any> | null = null;
if (__DEV__) addRxPlugin(RxDBDevModePlugin); // shows full errors
// :contentReference[oaicite:4]{index=4}

const hashFunction = async (input: string) => {
  // returns a HEX string by default
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    input
  );
  // :contentReference[oaicite:5]{index=5}
};

export async function getDb() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = (async () => {
    const db = await createRxDatabase({
      name: 'adomha_v2',
      multiInstance: false, // recommended for React Native :contentReference[oaicite:2]{index=2}
      storage: getRxStorageSQLiteTrial({
        sqliteBasics: getSQLiteBasicsExpoSQLiteAsync(SQLite.openDatabaseAsync),
      }),
      hashFunction
    });

    await db.addCollections({
      checkpoints: {
        schema: checkpointSchema,
      },
    });

    return db;
  })();

  return _dbPromise;
}