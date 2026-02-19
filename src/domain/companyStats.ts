// file: src/stats/companyStats.ts

import { loadCsv } from "../data/csv.ts";
import { db } from "../storage/db.ts";
import { withConcurrency } from "../utils/functions.ts";
import type { Difficulty, ManifestCompany } from "./types.ts";

export type DifficultyCounts = {
	readonly solved: number;
	readonly total: number;
};

export type CompanyStats = {
	readonly easy: DifficultyCounts;
	readonly medium: DifficultyCounts;
	readonly hard: DifficultyCounts;
	readonly total: DifficultyCounts;
	/** True if any solved in this company across all difficulties. */
	readonly anySolved: boolean;
};

export type LandingGlobalStats = {
	readonly solved: number;
	readonly total: number;
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
 * Compute per-company totals and solved counts by difficulty.
 *
 * totals:
 * - derived from CSV parse for this company only (unique links per difficulty).
 *
 * solved:
 * - derived from Dexie progress where completed=true and link is in company set.
 * - difficulty bucket is taken from the company CSV (linkToDiff), not db snapshot.
 */
export async function computeCompanyStats(args: {
	readonly company: ManifestCompany;
	readonly signal: AbortSignal;
}): Promise<CompanyStats> {
	const { company, signal } = args;

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

	return {
		easy: { solved: solvedByDiff.EASY, total: totals.EASY },
		medium: { solved: solvedByDiff.MEDIUM, total: totals.MEDIUM },
		hard: { solved: solvedByDiff.HARD, total: totals.HARD },
		total: { solved: solvedRows.length, total: links.length },
		anySolved: solvedRows.length > 0,
	};
}
