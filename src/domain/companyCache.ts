// file: src/stats/companyCache.ts

import { type CompanyCacheRow, db } from "../storage/db";

export type CachedCompanyStats = {
	readonly easy: { readonly solved: number; readonly total: number };
	readonly medium: { readonly solved: number; readonly total: number };
	readonly hard: { readonly solved: number; readonly total: number };
	readonly total: { readonly solved: number; readonly total: number };
};

function makeKey(manifestAt: string, company: string): string {
	return `${manifestAt}::${company}`;
}

/**
 * Read cached company stats for a given manifest version + company.
 * Returns null if missing.
 */
export async function readCompanyCache(
	manifestAt: string,
	company: string,
): Promise<CachedCompanyStats | null> {
	const key = makeKey(manifestAt, company);
	const row = await db.companyCache.get(key);
	if (!row) return null;

	return {
		easy: { solved: row.solvedEasy, total: row.totalEasy },
		medium: { solved: row.solvedMedium, total: row.totalMedium },
		hard: { solved: row.solvedHard, total: row.totalHard },
		total: { solved: row.solvedAll, total: row.totalAll },
	};
}

/**
 * Persist computed company stats in cache for this manifest version.
 */
export async function writeCompanyCache(args: {
	readonly manifestAt: string;
	readonly company: string;
	readonly stats: CachedCompanyStats;
}): Promise<void> {
	const { manifestAt, company, stats } = args;

	const row: CompanyCacheRow = {
		key: makeKey(manifestAt, company),
		manifestAt,
		company,

		totalEasy: stats.easy.total,
		totalMedium: stats.medium.total,
		totalHard: stats.hard.total,
		totalAll: stats.total.total,

		solvedEasy: stats.easy.solved,
		solvedMedium: stats.medium.solved,
		solvedHard: stats.hard.solved,
		solvedAll: stats.total.solved,

		computedAt: Date.now(),
	};

	await db.companyCache.put(row);
}
