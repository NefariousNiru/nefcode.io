// file: src/storage/db.ts

import Dexie, { type Table } from "dexie";
import type { Difficulty } from "../domain/types.ts";

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

	/** Snapshot of difficulty at time of solving for per-difficulty stats. */
	readonly difficulty: Difficulty;
};

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

	/** Epoch millis when this cache row was computed. */
	readonly computedAt: number;
};

/**
 * NefCodeDB
 * Purpose:
 * - Persist user progress locally via IndexedDB (Dexie).
 *
 * Schema:
 * - progress: keyed by link (global identity).
 *
 * Invariants:
 * - link is the primary key and must be stable (canonicalized upstream).
 */
export class NefCodeDB extends Dexie {
	// Dexie sets this via `this.table(...)` after version() config.
	public progress!: Table<ProblemProgress, string>;
	public companyCache!: Table<CompanyCacheRow, string>;

	public constructor() {
		super("nefcode.db.v1");

		this.version(1).stores({
			progress: "&link, updatedAt, completed, difficulty",
			companyCache: "&key, manifestAt, company, computedAt",
		});
	}
}

export const db = new NefCodeDB();
