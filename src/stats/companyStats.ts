// file: src/stats/companyStats.ts

import { loadCsv } from "../data/csv";
import type { Difficulty, ManifestCompany } from "../domain/types";
import {
	type CachedCompanyStats,
	readCompanyCache,
	writeCompanyCache,
} from "../storage/companyCache";
import { db } from "../storage/db";
import { withConcurrency } from "../utils/functions";

export type CompanyStats = CachedCompanyStats & {
	/** True if any solved in this company across all difficulties. */
	readonly anySolved: boolean;
};

function emptyCompanyStats(): CompanyStats {
	return {
		easy: { solved: 0, total: 0 },
		medium: { solved: 0, total: 0 },
		hard: { solved: 0, total: 0 },
		total: { solved: 0, total: 0 },
		anySolved: false,
	};
}

function inc(map: Map<string, Difficulty>, link: string, d: Difficulty) {
	if (!map.has(link)) map.set(link, d);
}

/**
 * getCompanyStats
 * Cached-only company stats.
 *
 * Behavior:
 * - Always attempts cache first (keyed by manifestAt + company.name).
 * - Cache is automatically invalidated by progressVersion (enforced in storage/companyCache).
 * - On cache miss, computes from CSV + progress table, writes cache, returns.
 *
 * Invariants:
 * - totals count unique links across the company CSVs (deduped by link).
 * - solved counts completed=true rows in progress for those links.
 * - difficulty buckets come from the company CSV, not the progress snapshot.
 */
export async function getCompanyStats(args: {
	readonly manifestAt: string;
	readonly company: ManifestCompany;
	readonly signal: AbortSignal;
}): Promise<CompanyStats> {
	const { manifestAt, company, signal } = args;

	// 1) Cache read (already validated vs current progressVersion)
	const cached = await readCompanyCache(manifestAt, company.name);
	if (cached) {
		return { ...cached, anySolved: cached.total.solved > 0 };
	}

	// 2) Compute (CSV -> linkToDiff, totals; progress -> solved counts)
	const linkToDiff = new Map<string, Difficulty>();

	await withConcurrency(company.files, 3, async (f) => {
		if (signal.aborted) return;
		const res = await loadCsv(f.url, signal);
		for (const row of res.items) inc(linkToDiff, row.link, row.difficulty);
	});

	const totals: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
	for (const d of linkToDiff.values()) totals[d] += 1;

	const links = [...linkToDiff.keys()];
	if (links.length === 0) return emptyCompanyStats();

	const solvedRows = await db.progress
		.where("link")
		.anyOf(links)
		.filter((r) => r.completed)
		.toArray();

	const solvedByDiff: Record<Difficulty, number> = {
		EASY: 0,
		MEDIUM: 0,
		HARD: 0,
	};

	for (const r of solvedRows) {
		const d = linkToDiff.get(r.link);
		if (!d) continue;
		solvedByDiff[d] += 1;
	}

	const computed: CachedCompanyStats = {
		easy: { solved: solvedByDiff.EASY, total: totals.EASY },
		medium: { solved: solvedByDiff.MEDIUM, total: totals.MEDIUM },
		hard: { solved: solvedByDiff.HARD, total: totals.HARD },
		total: { solved: solvedRows.length, total: links.length },
	};

	// 3) Write cache (stored with current progressVersion inside writeCompanyCache)
	await writeCompanyCache({
		manifestAt,
		company: company.name,
		stats: computed,
	});

	return { ...computed, anySolved: computed.total.solved > 0 };
}
