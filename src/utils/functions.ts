// file: src/utils/functions.ts

import type {
	Difficulty,
	ManifestCompany,
	ManifestFile,
} from "../domain/types.ts";

/**
 * Restrict pinned items to a maximum of 5.
 * Returns a new truncated array if necessary.
 */
export function clampPins(next: readonly string[]): string[] {
	return next.slice(0, 5);
}

/**
 * Pick a random file across all companies.
 * Returns null if no files exist.
 */
export function pickRandomFile(
	companies: readonly ManifestCompany[],
): { readonly company: string; readonly file: ManifestFile } | null {
	const flat: Array<{ company: string; file: ManifestFile }> = [];
	for (const c of companies)
		for (const f of c.files) flat.push({ company: c.name, file: f });
	if (flat.length === 0) return null;
	return flat[Math.floor(Math.random() * flat.length)] ?? null;
}

/**
 * Execute async work over a collection with a concurrency limit.
 *
 * Spawns up to `limit` parallel workers that process items sequentially
 * from the shared queue until all items are handled.
 *
 * @typeParam T - Item type
 * @param items - Collection of items to process
 * @param limit - Maximum number of concurrent workers (min 1)
 * @param fn - Async function invoked for each item
 *
 * @remarks
 * - Resolves when all items complete.
 * - Rejects immediately if any `fn` call throws.
 */
export async function withConcurrency<T>(
	items: readonly T[],
	limit: number,
	fn: (item: T) => Promise<void>,
): Promise<void> {
	const q = [...items];
	const workers = Array.from({ length: Math.max(1, limit) }, async () => {
		while (q.length > 0) {
			const item = q.shift();
			if (!item) return;
			await fn(item);
		}
	});
	await Promise.all(workers);
}

/**
 * Chip based on difficulty
 * @param d Difficulty d
 */
export function difficultyClass(d: Difficulty): string {
	const base = "chip px-3 py-1 text-xs font-medium";
	if (d === "EASY") return `${base} text-[rgba(34,197,94,0.95)]`;
	if (d === "MEDIUM") return `${base} text-[rgba(245,158,11,0.95)]`;
	return `${base} text-[rgba(239,68,68,0.95)]`;
}

/**
 * Get title of problem from LC link
 * @param link A leetcode url
 */
export function prettyProblemLink(link: string): string {
	try {
		const u = new URL(link);
		const parts = u.pathname.split("/").filter(Boolean);

		// Expect: ["problems", "<slug>"]
		const problemsIdx = parts.indexOf("problems");
		const slug =
			problemsIdx >= 0 && parts.length > problemsIdx + 1
				? parts[problemsIdx + 1]
				: (parts[0] ?? "");

		const cleaned = slug.replace(/[-_]+/g, " ").trim();
		if (!cleaned) {
			const s = u.toString();
			return s.length > 36 ? `${s.slice(0, 36)}…` : s;
		}

		// Title Case words (keep short words lowercased except first)
		const lowerWords = new Set([
			"a",
			"an",
			"the",
			"and",
			"or",
			"of",
			"to",
			"in",
			"on",
			"for",
			"with",
		]);
		const words = cleaned.split(/\s+/u);
		return words
			.map((w, i) => {
				const lw = w.toLowerCase();
				if (i !== 0 && lowerWords.has(lw)) return lw;
				return lw.charAt(0).toUpperCase() + lw.slice(1);
			})
			.join(" ");
	} catch {
		const s = link.replace(/^https?:\/\//, "");
		return s.length > 36 ? `${s.slice(0, 36)}…` : s;
	}
}
