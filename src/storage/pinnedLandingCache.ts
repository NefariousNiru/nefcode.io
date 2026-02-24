// file: src/storage/pinnedLandingCache.ts

import { db, type PinnedLandingCacheRow } from "./db.ts";
import { getProgressVersion } from "./meta.ts";

export type SolvedTotal = {
	readonly solved: number;
	readonly total: number;
};
export type CachedPinnedLandingStats = {
	readonly overall: SolvedTotal;
	readonly perList: ReadonlyMap<string, SolvedTotal>; // key = listUrl
};

function makeKey(manifestAt: string, company: string): string {
	return `${manifestAt}::${company}`;
}

function serializePerList(perList: ReadonlyMap<string, SolvedTotal>): string {
	return JSON.stringify([...perList.entries()]);
}

function deserializePerList(
	perListJson: string,
): ReadonlyMap<string, SolvedTotal> {
	const arr = JSON.parse(perListJson) as Array<[string, SolvedTotal]>;
	return new Map(arr);
}

/**
 * Read cached pinned landing stats for a company.
 * Returns null if missing or stale vs current progressVersion.
 */
export async function readPinnedLandingCache(
	manifestAt: string,
	company: string,
): Promise<CachedPinnedLandingStats | null> {
	const key = makeKey(manifestAt, company);
	const row = await db.pinnedLandingCache.get(key);
	if (!row) return null;

	const currentVersion = await getProgressVersion();
	if (row.progressVersion !== currentVersion) return null;

	return {
		overall: { solved: row.overallSolved, total: row.overallTotal },
		perList: deserializePerList(row.perListJson),
	};
}

/**
 * Persist pinned landing stats for the current progressVersion.
 */
export async function writePinnedLandingCache(args: {
	readonly manifestAt: string;
	readonly company: string;
	readonly overall: SolvedTotal;
	readonly perList: ReadonlyMap<string, SolvedTotal>;
}): Promise<void> {
	const { manifestAt, company, overall, perList } = args;

	const progressVersion = await getProgressVersion();
	const row: PinnedLandingCacheRow = {
		key: makeKey(manifestAt, company),
		manifestAt,
		company,
		overallSolved: overall.solved,
		overallTotal: overall.total,
		perListJson: serializePerList(perList),
		progressVersion,
		computedAt: Date.now(),
	};

	await db.pinnedLandingCache.put(row);
}
