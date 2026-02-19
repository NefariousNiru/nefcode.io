// file: src/storage/prefs.ts

export type RecentFile = {
	readonly company: string;
	readonly label: string;
	readonly url: string;
	readonly openedAt: number; // epoch millis
};

type PrefsSnapshot = {
	readonly pinnedCompanies: readonly string[];
	readonly recentFiles: readonly RecentFile[];
};

const KEY_PINS = "nefcode.pins.v1";
const KEY_RECENTS = "nefcode.recents.v1";

function safeParseJson<T>(raw: string | null): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

function uniqStrings(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const v of values) {
		const s = v.trim();
		if (!s) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		out.push(s);
	}
	return out;
}

function normalizeRecents(values: unknown): RecentFile[] {
	if (!Array.isArray(values)) return [];
	const out: RecentFile[] = [];
	for (const v of values) {
		if (typeof v !== "object" || v === null) continue;
		const r = v as Record<string, unknown>;
		const company = typeof r.company === "string" ? r.company.trim() : "";
		const label = typeof r.label === "string" ? r.label.trim() : "";
		const url = typeof r.url === "string" ? r.url.trim() : "";
		const openedAt =
			typeof r.openedAt === "number" && Number.isFinite(r.openedAt)
				? r.openedAt
				: 0;

		if (!company || !label || !url || openedAt <= 0) continue;
		out.push({ company, label, url, openedAt });
	}
	// newest first
	out.sort((a, b) => b.openedAt - a.openedAt);
	return out;
}

/**
 * Read UI prefs from localStorage.
 * Invariant: always returns a valid snapshot with safe defaults.
 */
export function readPrefs(): PrefsSnapshot {
	const pinsRaw = safeParseJson<unknown>(localStorage.getItem(KEY_PINS));
	const recentsRaw = safeParseJson<unknown>(localStorage.getItem(KEY_RECENTS));

	const pinnedCompanies = Array.isArray(pinsRaw)
		? uniqStrings(pinsRaw.filter((x) => typeof x === "string") as string[])
		: [];

	const recentFiles = normalizeRecents(recentsRaw);

	return { pinnedCompanies, recentFiles };
}

/**
 * Persist pinned companies list (deduped).
 */
export function writePinnedCompanies(companies: readonly string[]): void {
	const normalized = uniqStrings(companies);
	localStorage.setItem(KEY_PINS, JSON.stringify(normalized));
}

/**
 * Add or bump a recent file entry (deduped by url), capped to maxItems.
 */
export function upsertRecentFile(
	entry: Omit<RecentFile, "openedAt">,
	maxItems: number,
): void {
	const snap = readPrefs();
	const now = Date.now();

	const next: RecentFile[] = [
		{ ...entry, openedAt: now },
		...snap.recentFiles.filter((r) => r.url !== entry.url),
	];

	localStorage.setItem(
		KEY_RECENTS,
		JSON.stringify(next.slice(0, Math.max(1, maxItems))),
	);
}
