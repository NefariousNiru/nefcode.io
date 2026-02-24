// file: src/storage/companyFileQuickCache.ts

import { type CompanyFileQuickCacheRow, db } from "./db.ts";
import { getProgressVersion } from "./meta.ts";

export type CachedSolvedTotal = {
	readonly solved: number;
	readonly total: number;
};

function makeKey(manifestAt: string, company: string, listUrl: string): string {
	return `${manifestAt}::${company}::${listUrl}`;
}

/**
 * Read cached quick stats for a company list file.
 * Returns null if missing or stale vs current progressVersion.
 */
export async function readCompanyFileQuickCache(
	manifestAt: string,
	company: string,
	listUrl: string,
): Promise<CachedSolvedTotal | null> {
	const key = makeKey(manifestAt, company, listUrl);
	const row = await db.companyFileQuickCache.get(key);
	if (!row) return null;

	const currentVersion = await getProgressVersion();
	if (row.progressVersion !== currentVersion) return null;

	return { solved: row.solved, total: row.total };
}

/**
 * Persist quick stats for a company list file for the current progressVersion.
 */
export async function writeCompanyFileQuickCache(args: {
	readonly manifestAt: string;
	readonly company: string;
	readonly listUrl: string;
	readonly stats: CachedSolvedTotal;
}): Promise<void> {
	const { manifestAt, company, listUrl, stats } = args;

	const progressVersion = await getProgressVersion();
	const row: CompanyFileQuickCacheRow = {
		key: makeKey(manifestAt, company, listUrl),
		manifestAt,
		company,
		listUrl,
		solved: stats.solved,
		total: stats.total,
		progressVersion,
		computedAt: Date.now(),
	};

	await db.companyFileQuickCache.put(row);
}
