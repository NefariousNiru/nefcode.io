// file: src/storage/progress.ts

import type { Difficulty } from "../domain/types.ts";
import { db, type ProblemProgress } from "./db";

/**
 * Read progress for a single link. Returns null if none exists.
 */
export async function getProgress(
	link: string,
): Promise<ProblemProgress | null> {
	const row = await db.progress.get(link);
	return row ?? null;
}

/**
 * Bulk read progress by primary keys (links).
 * Returns a Map<link, progress>.
 */
export async function getProgressMap(
	links: readonly string[],
): Promise<Map<string, ProblemProgress>> {
	if (links.length === 0) return new Map();

	const rows = await db.progress.bulkGet([...links]);
	const out = new Map<string, ProblemProgress>();

	for (const r of rows) {
		if (!r) continue;
		out.set(r.link, r);
	}
	return out;
}

/**
 * Toggle global completion for a link.
 * Creates a row if missing.
 */
export async function toggleCompleted(
	link: string,
	difficulty: Difficulty,
): Promise<void> {
	const existing = await db.progress.get(link);
	const now = Date.now();

	if (!existing) {
		await db.progress.put({
			link: link,
			completed: true,
			minutes: null,
			notes: null,
			updatedAt: now,
			difficulty: difficulty,
		});
		return;
	}

	await db.progress.put({
		...existing,
		completed: !existing.completed,
		updatedAt: now,
	});
}

/**
 * Set minutes (global) for a link.
 * Creates a row if missing.
 */
export async function setMinutes(
	link: string,
	minutes: number | null,
	difficulty: Difficulty,
): Promise<void> {
	const existing = await db.progress.get(link);
	const now = Date.now();

	if (!existing) {
		await db.progress.put({
			link: link,
			completed: false,
			minutes: minutes,
			notes: null,
			updatedAt: now,
			difficulty: difficulty,
		});
		return;
	}

	await db.progress.put({ ...existing, minutes, updatedAt: now });
}

/**
 * Set notes (global) for a link.
 * Creates a row if missing.
 */
export async function setNotes(
	link: string,
	notes: string | null,
	difficulty: Difficulty,
): Promise<void> {
	const existing = await db.progress.get(link);
	const now = Date.now();

	if (!existing) {
		await db.progress.put({
			link: link,
			completed: false,
			minutes: null,
			notes: notes,
			updatedAt: now,
			difficulty: difficulty,
		});
		return;
	}

	await db.progress.put({ ...existing, notes, updatedAt: now });
}
