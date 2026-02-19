// file: src/stats/landingStats.ts

import { loadCsv } from "../data/csv";
import { db } from "../storage/db";
import { withConcurrency } from "../utils/functions.ts";
import type { ManifestCompany, ManifestFile } from "./types.ts";

export type SolvedTotal = {
	readonly solved: number;
	readonly total: number;
};

export type CompanyLandingStats = {
	readonly company: string;
	readonly overall: SolvedTotal;
	readonly perList: ReadonlyMap<string, SolvedTotal>; // key = file.url
};

/**
 * Compute solved/total for a single list (CSV file).
 * Invariants:
 * - total counts unique problem links in the list (deduped by link).
 * - solved counts completed=true rows in Dexie for those links.
 */
export async function computeListSolvedTotal(
	urlRelative: string,
	signal: AbortSignal,
): Promise<SolvedTotal> {
	const res = await loadCsv(urlRelative, signal);

	const linkSet = new Set<string>();
	for (const row of res.items) linkSet.add(row.link);

	const links = [...linkSet];
	if (links.length === 0) return { solved: 0, total: 0 };

	const solvedRows = await db.progress
		.where("link")
		.anyOf(links)
		.filter((r) => r.completed)
		.toArray();

	return { solved: solvedRows.length, total: links.length };
}

/**
 * Compute pinned-company stats for landing:
 * - overall = union of unique links across all files in the company
 * - perList = solved/total for each list file
 *
 * Notes:
 * - We only ever call this for pinned companies (max 5), so parsing is bounded.
 */
export async function computePinnedCompanyStats(
	company: ManifestCompany,
	signal: AbortSignal,
): Promise<CompanyLandingStats> {
	const perList = new Map<string, SolvedTotal>();
	const unionLinks = new Set<string>();

	// Parse each list once; update perList and union.
	// Concurrency cap avoids spiky fetches.
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
			perList.set(f.url, { solved: 0, total: 0 });
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
	if (union.length === 0) {
		return {
			company: company.name,
			overall: { solved: 0, total: 0 },
			perList,
		};
	}

	const solvedUnionRows = await db.progress
		.where("link")
		.anyOf(union)
		.filter((r) => r.completed)
		.toArray();

	return {
		company: company.name,
		overall: { solved: solvedUnionRows.length, total: union.length },
		perList,
	};
}
