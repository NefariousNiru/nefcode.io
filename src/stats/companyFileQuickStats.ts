// file: src/stats/companyFileQuickStats.ts

import { loadCsv } from "../data/csv";
import {
	type CachedSolvedTotal,
	readCompanyFileQuickCache,
	writeCompanyFileQuickCache,
} from "../storage/companyFileQuickCache";
import { db } from "../storage/db";

/**
 * getCompanyFileQuickStats
 * Cached-only solved/total for a single company list file (CSV).
 *
 * Cache key:
 * - (manifestAt, companyName, listUrl)
 *
 * Invalidation:
 * - progressVersion (enforced in readCompanyFileQuickCache)
 */
export async function getCompanyFileQuickStats(args: {
	readonly manifestAt: string;
	readonly companyName: string;
	readonly listUrl: string;
	readonly signal: AbortSignal;
}): Promise<CachedSolvedTotal> {
	const { manifestAt, companyName, listUrl, signal } = args;

	const cached = await readCompanyFileQuickCache(
		manifestAt,
		companyName,
		listUrl,
	);
	if (cached) return cached;

	const res = await loadCsv(listUrl, signal);

	// totals = unique links in this list
	const linkSet = new Set<string>();
	for (const row of res.items) linkSet.add(row.link);

	const links = [...linkSet];
	if (links.length === 0) {
		const empty = { solved: 0, total: 0 };
		await writeCompanyFileQuickCache({
			manifestAt,
			company: companyName,
			listUrl,
			stats: empty,
		});
		return empty;
	}

	const solvedRows = await db.progress
		.where("link")
		.anyOf(links)
		.filter((r) => r.completed)
		.toArray();

	const stats = { solved: solvedRows.length, total: links.length };

	await writeCompanyFileQuickCache({
		manifestAt,
		company: companyName,
		listUrl,
		stats,
	});

	return stats;
}
