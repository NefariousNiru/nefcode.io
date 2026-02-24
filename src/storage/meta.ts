// file: src/storage/meta.ts

import { db, type MetaRow } from "./db";

const PROGRESS_VERSION_KEY = "progress_version";

/**
 * Read the current progressVersion.
 * This monotonically increases whenever progress rows are mutated.
 *
 * Why it exists:
 * - stats caches can store which version they were computed against
 * - if the current version differs, cached solved counts are stale
 */
export async function getProgressVersion(): Promise<number> {
	const row = await db.meta.get(PROGRESS_VERSION_KEY);
	return row?.value ?? 0;
}

/**
 * Increment progressVersion.
 * Call this after any mutation that can change solved counts (completed toggles),
 * or anything you want to invalidate “solved-based” caches for.
 */
export async function bumpProgressVersion(): Promise<number> {
	const now = Date.now();

	// Use a transaction to keep the read-modify-write atomic.
	return db.transaction("rw", db.meta, async () => {
		const existing = await db.meta.get(PROGRESS_VERSION_KEY);
		const nextValue = (existing?.value ?? 0) + 1;

		const row: MetaRow = {
			key: PROGRESS_VERSION_KEY,
			value: nextValue,
			updatedAt: now,
		};

		await db.meta.put(row);
		return nextValue;
	});
}
