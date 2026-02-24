// file: src/stats/landingStats.ts

import { loadCsv } from "../data/csv";
import type { ManifestCompany, ManifestFile } from "../domain/types";
import { db } from "../storage/db";
import {
	readListStatsCache,
	writeListStatsCache,
} from "../storage/listStatsCache";
import {
	type SolvedTotal as CacheSolvedTotal,
	readPinnedLandingCache,
	writePinnedLandingCache,
} from "../storage/pinnedLandingCache";
import { withConcurrency } from "../utils/functions";

export type SolvedTotal = CacheSolvedTotal;

export type CompanyLandingStats = {
	readonly company: string;
	readonly overall: SolvedTotal;
	readonly perList: ReadonlyMap<string, SolvedTotal>; // key = file.url
};

function emptySolvedTotal(): SolvedTotal {
	return { solved: 0, total: 0 };
}

/**
 * Cached-only list stats.
 * Key: (manifestAt, listUrl). Invalidation: progressVersion (inside cache read).
 */
export async function getListSolvedTotal(args: {
	readonly manifestAt: string;
	readonly listUrl: string;
	readonly signal: AbortSignal;
}): Promise<SolvedTotal> {
	const { manifestAt, listUrl, signal } = args;

	const cached = await readListStatsCache(manifestAt, listUrl);
	if (cached) return cached;

	const res = await loadCsv(listUrl, signal);

	const linkSet = new Set<string>();
	for (const row of res.items) linkSet.add(row.link);

	const links = [...linkSet];
	if (links.length === 0) return emptySolvedTotal();

	const solvedRows = await db.progress
		.where("link")
		.anyOf(links)
		.filter((r) => r.completed)
		.toArray();

	const stats = { solved: solvedRows.length, total: links.length };
	await writeListStatsCache({ manifestAt, listUrl, stats });
	return stats;
}

/**
 * Cached-only pinned company landing stats.
 * Key: (manifestAt, company.name). Invalidation: progressVersion (inside cache read).
 */
export async function getPinnedCompanyStats(args: {
	readonly manifestAt: string;
	readonly company: ManifestCompany;
	readonly signal: AbortSignal;
}): Promise<CompanyLandingStats> {
	const { manifestAt, company, signal } = args;

	const cached = await readPinnedLandingCache(manifestAt, company.name);
	if (cached) {
		return {
			company: company.name,
			overall: cached.overall,
			perList: cached.perList,
		};
	}

	const perList = new Map<string, SolvedTotal>();
	const unionLinks = new Set<string>();

	// Parse each list once; update perList and union.
	await withConcurrency(company.files, 3, async (f: ManifestFile) => {
		if (signal.aborted) return;

		const res = await loadCsv(f.url, signal);
		const listLinks = new Set<string>();

		for (const row of res.items) {
			listLinks.add(row.link);
			unionLinks.add(row.link);
		}

		const links = [...listLinks];
		if (links.length === 0) {
			perList.set(f.url, emptySolvedTotal());
			return;
		}

		const solvedRows = await db.progress
			.where("link")
			.anyOf(links)
			.filter((r) => r.completed)
			.toArray();

		perList.set(f.url, { solved: solvedRows.length, total: links.length });
	});

	const union = [...unionLinks];
	const overall =
		union.length === 0
			? emptySolvedTotal()
			: {
					solved: (
						await db.progress
							.where("link")
							.anyOf(union)
							.filter((r) => r.completed)
							.toArray()
					).length,
					total: union.length,
				};

	await writePinnedLandingCache({
		manifestAt,
		company: company.name,
		overall,
		perList,
	});

	return { company: company.name, overall, perList };
}
