// file: src/utils/functions.ts

import type { ManifestCompany, ManifestFile } from "../domain/types.ts";

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
