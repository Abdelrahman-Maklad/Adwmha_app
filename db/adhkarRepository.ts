import { ADHKAR_SEED_DOCS } from "./adhkarData";
import { AdhkarItem, AdhkarSetDoc } from "./adhkarTypes";
import { getDb } from "./sqlite";

function mergeSetWithSeed(existing: AdhkarSetDoc, seed: AdhkarSetDoc): AdhkarSetDoc {
  const seedItemById = new Map<string, AdhkarItem>();
  seed.items.forEach((item) => seedItemById.set(item.id, item));

  const mergedExistingItems = (existing.items ?? []).map((item) => {
    const seedMatch = seedItemById.get(item.id);
    if (!seedMatch) return item;

    const normalizedReference =
      item.reference ??
      item.refrence ??
      seedMatch.reference ??
      seedMatch.refrence;

    return {
      ...item,
      content_type: item.content_type ?? seedMatch.content_type,
      quran: item.quran ?? seedMatch.quran,
      reference: normalizedReference,
      refrence: undefined,
    };
  });

  const mergedIds = new Set(mergedExistingItems.map((item) => item.id));
  const appendedSeedItems = seed.items
    .filter((item) => !mergedIds.has(item.id))
    .map((item) => ({
      ...item,
      reference: item.reference ?? item.refrence,
      refrence: undefined,
    }));

  return {
    ...existing,
    title_ar: existing.title_ar || seed.title_ar,
    type: existing.type || seed.type,
    items: [...mergedExistingItems, ...appendedSeedItems],
    metadata: {
      ...(seed.metadata ?? {}),
      ...(existing.metadata ?? {}),
      updatedAt: seed.metadata?.updatedAt ?? existing.metadata?.updatedAt ?? "",
    },
  };
}

export async function seedAdhkarSetsIfEmpty(): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>("SELECT COUNT(*) as c FROM adhkar_sets;");
  const hasRows = (row?.c ?? 0) > 0;

  if (!hasRows) {
    await db.withTransactionAsync(async () => {
      for (const doc of ADHKAR_SEED_DOCS) {
        await db.runAsync(
          "INSERT OR REPLACE INTO adhkar_sets (_id, doc) VALUES (?, ?);",
          [doc._id, JSON.stringify(doc)]
        );
      }
    });
    return;
  }

  const rows = await db.getAllAsync<{ _id: string; doc: string }>(
    "SELECT _id, doc FROM adhkar_sets;"
  );
  const existingById = new Map<string, AdhkarSetDoc>();
  rows.forEach((entry) => {
    existingById.set(entry._id, JSON.parse(entry.doc) as AdhkarSetDoc);
  });

  await db.withTransactionAsync(async () => {
    for (const seedDoc of ADHKAR_SEED_DOCS) {
      const existing = existingById.get(seedDoc._id);
      const merged = existing ? mergeSetWithSeed(existing, seedDoc) : seedDoc;

      await db.runAsync(
        "INSERT OR REPLACE INTO adhkar_sets (_id, doc) VALUES (?, ?);",
        [merged._id, JSON.stringify(merged)]
      );
    }
  });
}

export async function getAdhkarSetById(setId: string): Promise<AdhkarSetDoc | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ _id: string; doc: string }>(
    "SELECT _id, doc FROM adhkar_sets WHERE _id = ?;",
    [setId]
  );
  if (!row) return null;
  return JSON.parse(row.doc) as AdhkarSetDoc;
}

export async function ensureAdhkarSeededAndGet(setId: string): Promise<AdhkarSetDoc | null> {
  await seedAdhkarSetsIfEmpty();
  return getAdhkarSetById(setId);
}
