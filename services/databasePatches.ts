import type { SQLiteDatabase } from "expo-sqlite";

const DB_PATCH_VERSION_KEY = "db_patch_version";
export const LATEST_DB_PATCH_VERSION = 4;

type CheckpointFieldPatch = {
  checkpointId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

type TaskFieldPatch = {
  checkpointId: string;
  taskId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

type PatchRunner = (db: SQLiteDatabase) => Promise<void>;

function safeParseVersion(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return parsed;
}

function areEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function getCurrentPatchVersion(db: SQLiteDatabase): Promise<number> {
  try {
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = ?;",
      [DB_PATCH_VERSION_KEY]
    );
    return safeParseVersion(row?.value ?? null);
  } catch (error) {
    console.warn("[db-patch] Failed to read patch version. Falling back to 0.", error);
    return 0;
  }
}

export async function setCurrentPatchVersion(db: SQLiteDatabase, version: number): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?);",
    [DB_PATCH_VERSION_KEY, String(version)]
  );
}

async function loadCheckpointDoc(db: SQLiteDatabase, checkpointId: string): Promise<any | null> {
  const row = await db.getFirstAsync<{ id: string; doc: string }>(
    "SELECT id, doc FROM checkpoints WHERE id = ?;",
    [checkpointId]
  );
  if (!row?.doc) return null;

  try {
    return JSON.parse(row.doc);
  } catch (error) {
    console.warn(`[db-patch] Invalid JSON for checkpoint ${checkpointId}. Skipping row.`, error);
    return null;
  }
}

async function saveCheckpointDoc(db: SQLiteDatabase, checkpointId: string, doc: any): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO checkpoints (id, doc) VALUES (?, ?);",
    [checkpointId, JSON.stringify(doc)]
  );
}

async function applyCheckpointFieldPatches(
  db: SQLiteDatabase,
  patches: CheckpointFieldPatch[]
): Promise<void> {
  const grouped = new Map<string, CheckpointFieldPatch[]>();
  for (const patch of patches) {
    const list = grouped.get(patch.checkpointId) ?? [];
    list.push(patch);
    grouped.set(patch.checkpointId, list);
  }

  for (const [checkpointId, checkpointPatches] of grouped.entries()) {
    const checkpoint = await loadCheckpointDoc(db, checkpointId);
    if (!checkpoint) continue;

    let changed = false;
    for (const patch of checkpointPatches) {
      const currentValue = checkpoint?.[patch.field];

      if (areEqual(currentValue, patch.newValue)) continue;
      if (!areEqual(currentValue, patch.oldValue)) continue;

      checkpoint[patch.field] = patch.newValue;
      changed = true;
    }

    if (changed) {
      await saveCheckpointDoc(db, checkpointId, checkpoint);
    }
  }
}

async function applyTaskFieldPatches(db: SQLiteDatabase, patches: TaskFieldPatch[]): Promise<void> {
  const grouped = new Map<string, TaskFieldPatch[]>();
  for (const patch of patches) {
    const list = grouped.get(patch.checkpointId) ?? [];
    list.push(patch);
    grouped.set(patch.checkpointId, list);
  }

  for (const [checkpointId, checkpointPatches] of grouped.entries()) {
    const checkpoint = await loadCheckpointDoc(db, checkpointId);
    if (!checkpoint) continue;

    const tasks = Array.isArray(checkpoint.tasks) ? checkpoint.tasks : [];
    if (tasks.length === 0) continue;

    let changed = false;
    for (const patch of checkpointPatches) {
      const task = tasks.find((candidate: any) => String(candidate?.id) === patch.taskId);
      if (!task) continue;

      const currentValue = task?.[patch.field];

      if (areEqual(currentValue, patch.newValue)) continue;
      if (!areEqual(currentValue, patch.oldValue)) continue;

      task[patch.field] = patch.newValue;
      changed = true;
    }

    if (changed) {
      checkpoint.tasks = tasks;
      await saveCheckpointDoc(db, checkpointId, checkpoint);
    }
  }
}

async function runPatchV4(db: SQLiteDatabase): Promise<void> {
  // Real patch derived from current db/defaultData.ts changes.
  // Guarded oldValue/newValue updates keep user-customized values safe.
  const checkpointPatches: CheckpointFieldPatch[] = [
    {
      checkpointId: "cp_fajr",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue:
        "وما تقرب إلي عبدي بشيء 🥇أحب إلي مما افترضت عليه🥇 ، وما يزال عبدي يتقرب إلي بالنوافل حتى أحبه ، فإذا أحببته كنت سمعه الذي يسمع به ، وبصره الذي يبصر به ، ويده التي يبطش بها ، ورجله التي يمشي بها ، وإن سألني لأعطينه ، ولئن استعاذني لأعيذنه",
    },
    {
      checkpointId: "cp_sunrise",
      field: "notification_title",
      oldValue: "حان وقت صلاة الشروق",
      newValue: "حان وقت الشروق",
    },
    {
      checkpointId: "cp_sunrise",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue: "احرص علي صلاة الضحى (بعد شروق الشمس بثلث ساعة الي قبل الظهر بربع ساعة)",
    },
    {
      checkpointId: "cp_dhuhr",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue:
        "وما تقرب إلي عبدي بشيء 🥇أحب إلي مما افترضت عليه🥇 ، وما يزال عبدي يتقرب إلي بالنوافل حتى أحبه ، فإذا أحببته كنت سمعه الذي يسمع به ، وبصره الذي يبصر به ، ويده التي يبطش بها ، ورجله التي يمشي بها ، وإن سألني لأعطينه ، ولئن استعاذني لأعيذنه",
    },
    {
      checkpointId: "cp_asr",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue:
        "وما تقرب إلي عبدي بشيء 🥇أحب إلي مما افترضت عليه🥇 ، وما يزال عبدي يتقرب إلي بالنوافل حتى أحبه ، فإذا أحببته كنت سمعه الذي يسمع به ، وبصره الذي يبصر به ، ويده التي يبطش بها ، ورجله التي يمشي بها ، وإن سألني لأعطينه ، ولئن استعاذني لأعيذنه",
    },
    {
      checkpointId: "cp_maghrib",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue:
        "وما تقرب إلي عبدي بشيء 🥇أحب إلي مما افترضت عليه🥇 ، وما يزال عبدي يتقرب إلي بالنوافل حتى أحبه ، فإذا أحببته كنت سمعه الذي يسمع به ، وبصره الذي يبصر به ، ويده التي يبطش بها ، ورجله التي يمشي بها ، وإن سألني لأعطينه ، ولئن استعاذني لأعيذنه",
    },
    {
      checkpointId: "cp_isha",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue:
        "وما تقرب إلي عبدي بشيء 🥇أحب إلي مما افترضت عليه🥇 ، وما يزال عبدي يتقرب إلي بالنوافل حتى أحبه ، فإذا أحببته كنت سمعه الذي يسمع به ، وبصره الذي يبصر به ، ويده التي يبطش بها ، ورجله التي يمشي بها ، وإن سألني لأعطينه ، ولئن استعاذني لأعيذنه",
    },
    {
      checkpointId: "cp_lastthird",
      field: "notification_title",
      oldValue: "حان وقت صلاة الثلث الأخير من الليل",
      newValue: "حان وقت الثلث الأخير من الليل",
    },
    {
      checkpointId: "cp_lastthird",
      field: "notification_text",
      oldValue: " حي علي الصلاة حي علي الفلاح 🕌",
      newValue:
        "ينزل ربنا إلى السماء الدنيا كل ليلة حين يبقى ثلث الليل الآخر، فيقول: من يدعوني فأستجيب له، من يسألني فأعطيه، من يستغفرني فأغفر له.. حتى ينفجر الفجر",
    },
  ];

  const taskPatches: TaskFieldPatch[] = [
    {
      checkpointId: "cp_fajr",
      taskId: "t_fajr_sabah",
      field: "notification_title",
      oldValue: "",
      newValue: "تذكير : أذكار الصباح",
    },
    {
      checkpointId: "cp_fajr",
      taskId: "t_fajr_sabah",
      field: "notification_text",
      oldValue: "",
      newValue: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    },
    {
      checkpointId: "cp_sunrise",
      taskId: "t_duha",
      field: "notification_title",
      oldValue: "",
      newValue: "تذكير : صلاة الضحي",
    },
    {
      checkpointId: "cp_sunrise",
      taskId: "t_duha",
      field: "notification_text",
      oldValue: "",
      newValue:
        "يُصْبِحُ عَلَىَ كُلّ سُلاَمَىَ مِنْ أَحَدِكُمْ صَدَقَةٌ. فَكُلّ تَسْبِيحَةٍ صَدَقَةٌ. وَكُلّ تَحْمِيدَةٍ صَدَقَةٌ. وَكُلّ تَهْلِيلَةٍ صَدَقَةٌ. وَكُلّ تَكْبِيرَةٍ صَدَقَةٌ. وَأَمْرٌ بِالْمَعْرُوفِ صَدَقَةٌ. وَنَهْيٌ عَنِ الْمُنْكَرِ صَدَقَةٌ. وَيُجَزِئُ، مِنْ ذَلِكَ، رَكْعَتَانِ يَرْكَعُهُمَا مِنَ الضّحَىَ",
    },
    {
      checkpointId: "cp_asr",
      taskId: "t_masaa",
      field: "notification_title",
      oldValue: "?????: ????? ??????",
      newValue: "تذكير : أذكار المساء",
    },
    {
      checkpointId: "cp_asr",
      taskId: "t_masaa",
      field: "notification_text",
      oldValue: "حان وقت أذكار المساء",
      newValue: "الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    },
  ];

  await applyCheckpointFieldPatches(db, checkpointPatches);
  await applyTaskFieldPatches(db, taskPatches);
}

const PATCH_RUNNERS: Record<number, PatchRunner> = {
  4: runPatchV4,
};

export async function applyDatabasePatches(db: SQLiteDatabase): Promise<void> {
  const currentVersion = await getCurrentPatchVersion(db);
  if (currentVersion >= LATEST_DB_PATCH_VERSION) return;

  const targetVersions = Object.keys(PATCH_RUNNERS)
    .map((value) => Number(value))
    .filter((version) => Number.isInteger(version) && version > currentVersion)
    .sort((a, b) => a - b);

  for (const targetVersion of targetVersions) {
    const patchRunner = PATCH_RUNNERS[targetVersion]!;

    try {
      await db.withTransactionAsync(async () => {
        await patchRunner(db);
      });

      await setCurrentPatchVersion(db, targetVersion);
      console.log(`[db-patch] Applied patch v${targetVersion}`);
    } catch (error) {
      // Do not crash app startup; stop at first failed patch.
      console.error(`[db-patch] Failed at patch v${targetVersion}.`, error);
      return;
    }
  }
}
