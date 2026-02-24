// file: src/storage/listStatsCache.ts

import { db, type ListStatsCacheRow } from "./db.ts";
import { getProgressVersion } from "./meta.ts";

export type CachedSolvedTotal = {
	readonly solved: number;
	readonly total: number;
};

function makeKey(manifestAt: string, listUrl: string): string {
	return `${manifestAt}::${listUrl}`;
}

/**
 * Read a cached solved/total for a list.
 * Returns null when:
 * - missing, or
 * - computed for an older progressVersion (stale solved counts).
 */
export async function readListStatsCache(
	manifestAt: string,
	listUrl: string,
): Promise<CachedSolvedTotal | null> {
	const key = makeKey(manifestAt, listUrl);
	const row = await db.listStatsCache.get(key);
	if (!row) return null;

	const currentVersion = await getProgressVersion();
	if (row.progressVersion !== currentVersion) return null;

	return { solved: row.solved, total: row.total };
}

/**
 * Persist list solved/total for the current progressVersion.
 */
export async function writeListStatsCache(args: {
	readonly manifestAt: string;
	readonly listUrl: string;
	readonly stats: CachedSolvedTotal;
}): Promise<void> {
	const { manifestAt, listUrl, stats } = args;

	const progressVersion = await getProgressVersion();
	const row: ListStatsCacheRow = {
		key: makeKey(manifestAt, listUrl),
		manifestAt,
		listUrl,
		solved: stats.solved,
		total: stats.total,
		progressVersion,
		computedAt: Date.now(),
	};

	await db.listStatsCache.put(row);
}
