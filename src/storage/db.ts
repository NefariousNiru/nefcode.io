// file: src/storage/db.ts

import Dexie, { type Table } from "dexie";
import type { Difficulty } from "../domain/types.ts";

/**
 * ProblemProgress
 * One row per canonical problem link.
 * This is the single source of truth for completion/minutes/notes in IndexedDB.
 */
export type ProblemProgress = {
	/** Global identity. Primary key. */
	readonly link: string;

	/** Global completion. */
	readonly completed: boolean;

	/** Minutes spent total (global). Nullable until user sets it. */
	readonly minutes: number | null;

	/** Notes/comments (global). Nullable until user sets it. */
	readonly notes: string | null;

	/** Epoch millis. Updated whenever we mutate this row. */
	readonly updatedAt: number;

	/**
	 * Snapshot of difficulty at time of last write.
	 * Used for UI display and some stats, but company bucketing uses CSV truth.
	 */
	readonly difficulty: Difficulty;
};

/**
 * MetaRow
 * Generic key/value store for app-level counters and flags.
 */
export type MetaRow = {
	/** Primary key for meta entry (e.g. "progress_version"). */
	readonly key: string;

	/** Numeric value stored for the key. */
	readonly value: number;

	/** Epoch millis when this meta row was last updated. */
	readonly updatedAt: number;
};

/**
 * CompanyCacheRow
 * Cache for per-company totals + solved counts (bucketed by company CSV difficulty).
 *
 * Keyed by manifest version (manifestAt) + company name.
 * Invalidated when progressVersion changes.
 */
export type CompanyCacheRow = {
	/** Compound primary key: `${manifestAt}::${company}` */
	readonly key: string;

	readonly manifestAt: string;
	readonly company: string;

	/** Totals by difficulty within company (unique links). */
	readonly totalEasy: number;
	readonly totalMedium: number;
	readonly totalHard: number;
	readonly totalAll: number;

	/** Solved by difficulty within company (completed=true, bucketed by company CSV diff). */
	readonly solvedEasy: number;
	readonly solvedMedium: number;
	readonly solvedHard: number;
	readonly solvedAll: number;

	/** Progress version used when this row was computed. */
	readonly progressVersion: number;

	/** Epoch millis when this cache row was computed. */
	readonly computedAt: number;
};

/**
 * ListStatsCacheRow
 * Cache for solved/total stats for a single CSV list (e.g. a "recent list").
 *
 * Keyed by manifestAt + listUrl.
 * Invalidated when progressVersion changes.
 */
export type ListStatsCacheRow = {
	/** Compound primary key: `${manifestAt}::${listUrl}` */
	readonly key: string;

	readonly manifestAt: string;
	readonly listUrl: string;

	readonly solved: number;
	readonly total: number;

	/** Progress version used when this row was computed. */
	readonly progressVersion: number;

	/** Epoch millis when this cache row was computed. */
	readonly computedAt: number;
};

/**
 * PinnedLandingCacheRow
 * Cache for landing pinned-company stats:
 * - overall solved/total
 * - perList solved/total
 *
 * Stored as JSON for perList to keep schema simple.
 * Invalidated when progressVersion changes.
 */
export type PinnedLandingCacheRow = {
	/** Compound primary key: `${manifestAt}::${company}` */
	readonly key: string;

	readonly manifestAt: string;
	readonly company: string;

	readonly overallSolved: number;
	readonly overallTotal: number;

	/**
	 * JSON string of:
	 *   Array<[listUrl: string, { solved: number, total: number }]>
	 * Using Array keeps ordering stable and avoids Map serialization issues.
	 */
	readonly perListJson: string;

	/** Progress version used when this row was computed. */
	readonly progressVersion: number;

	/** Epoch millis when this cache row was computed. */
	readonly computedAt: number;
};

/**
 * CompanyFileQuickCacheRow
 * Cache for company files page “quick stats” per file (list).
 *
 * Keyed by manifestAt + company + listUrl.
 * Invalidated when progressVersion changes.
 */
export type CompanyFileQuickCacheRow = {
	/** Compound primary key: `${manifestAt}::${company}::${listUrl}` */
	readonly key: string;

	readonly manifestAt: string;
	readonly company: string;
	readonly listUrl: string;

	readonly solved: number;
	readonly total: number;

	/** Progress version used when this row was computed. */
	readonly progressVersion: number;

	/** Epoch millis when this cache row was computed. */
	readonly computedAt: number;
};

/**
 * NefCodeDB
 * Persist user progress and derived stats in IndexedDB via Dexie.
 */
export class NefCodeDB extends Dexie {
	public progress!: Table<ProblemProgress, string>;

	/** Single-row counters/flags, e.g. progress version. */
	public meta!: Table<MetaRow, string>;

	/** Cached stats tables. */
	public companyCache!: Table<CompanyCacheRow, string>;
	public listStatsCache!: Table<ListStatsCacheRow, string>;
	public pinnedLandingCache!: Table<PinnedLandingCacheRow, string>;
	public companyFileQuickCache!: Table<CompanyFileQuickCacheRow, string>;

	public constructor() {
		super("nefcode.db.v1");

		this.version(1).stores({
			progress: "&link, updatedAt, completed, difficulty",
			meta: "&key, updatedAt",
			companyCache: "&key, manifestAt, company, progressVersion, computedAt",
			listStatsCache: "&key, manifestAt, listUrl, progressVersion, computedAt",
			pinnedLandingCache:
				"&key, manifestAt, company, progressVersion, computedAt",
			companyFileQuickCache:
				"&key, manifestAt, company, listUrl, progressVersion, computedAt",
		});
	}
}

export const db = new NefCodeDB();
