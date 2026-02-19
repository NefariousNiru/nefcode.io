// file: src/domain/normalize.ts

import type { CsvRowRaw, Difficulty, ProblemRow } from "./types";

export type NormalizeIssue = {
	readonly rowIndex: number;
	readonly field: string;
	readonly message: string;
};

const isDifficulty = (v: string): v is Difficulty =>
	v === "EASY" || v === "MEDIUM" || v === "HARD";

/**
 * Normalize LeetCode problem link into a stable global key.
 * - Removes query/hash
 * - Trims whitespace
 * - Removes trailing slash
 */
export function normalizeLink(input: string): string {
	const trimmed = input.trim();
	// URL constructor throws on some malformed inputs; fall back to manual cleanup.
	try {
		const u = new URL(trimmed);
		u.hash = "";
		u.search = "";
		const s = u.toString();
		return s.endsWith("/") ? s.slice(0, -1) : s;
	} catch {
		const noHash = trimmed.split("#")[0] ?? "";
		const noQuery = (noHash.split("?")[0] ?? "").trim();
		return noQuery.endsWith("/") ? noQuery.slice(0, -1) : noQuery;
	}
}

/**
 * Parse acceptance rate from CSV. Some sources use 0..1, others use 0..100.
 * Returns null if missing/unparseable.
 */
export function parseAcceptanceRate(input: string | undefined): number | null {
	if (!input) return null;
	const s = input.trim();
	if (!s) return null;

	const n = Number(s);
	if (!Number.isFinite(n)) return null;

	if (n >= 0 && n <= 1) return n;
	if (n > 1 && n <= 100) return n / 100;
	return null;
}

/**
 * Parse frequency into a non-negative number. Defaults to 0 on missing/unparseable.
 */
export function parseFrequency(input: string | undefined): number {
	if (!input) return 0;
	const n = Number(input.trim());
	if (!Number.isFinite(n) || n < 0) return 0;
	return n;
}

/**
 * Parse topics from a CSV field like: "Array, Hash Table"
 */
export function parseTopics(input: string | undefined): readonly string[] {
	if (!input) return [];
	const raw = input.trim();
	if (!raw) return [];
	return raw
		.split(",")
		.map((t) => t.trim())
		.filter((t) => t.length > 0);
}

/**
 * Normalize and validate a CSV row into the internal ProblemRow format.
 * Invariants:
 * - link is non-empty and canonicalized
 * - title is non-empty
 * - difficulty is one of EASY|MEDIUM|HARD
 */
export function normalizeProblemRows(rows: readonly CsvRowRaw[]): {
	readonly items: readonly ProblemRow[];
	readonly issues: readonly NormalizeIssue[];
} {
	const items: ProblemRow[] = [];
	const issues: NormalizeIssue[] = [];

	rows.forEach((r, idx) => {
		const title = (r.Title ?? "").trim();
		const linkRaw = (r.Link ?? "").trim();
		const diffRaw = (r.Difficulty ?? "").trim().toUpperCase();

		if (!title) {
			issues.push({ rowIndex: idx, field: "Title", message: "Missing title" });
			return;
		}
		if (!linkRaw) {
			issues.push({ rowIndex: idx, field: "Link", message: "Missing link" });
			return;
		}
		if (!isDifficulty(diffRaw)) {
			issues.push({
				rowIndex: idx,
				field: "Difficulty",
				message: `Invalid difficulty: "${diffRaw || "(empty)"}"`,
			});
			return;
		}

		const link = normalizeLink(linkRaw);
		if (!link) {
			issues.push({ rowIndex: idx, field: "Link", message: "Invalid link" });
			return;
		}

		items.push({
			difficulty: diffRaw,
			title,
			frequency: parseFrequency(r.Frequency),
			acceptanceRate: parseAcceptanceRate(r["Acceptance Rate"]),
			link,
			topics: parseTopics(r.Topics),
		});
	});

	return { items, issues };
}

/**
 * Convert a CSV/list label into a user-facing title.
 * Examples:
 * - "1. Thirty Days" -> "Thirty Days"
 * - "2. Three Months" -> "Three Months"
 * - "4. More Than Six Months" -> "More Than Six Months"
 *
 * Invariants:
 * - Never returns empty string; falls back to trimmed input.
 */
export function formatListLabel(raw: string): string {
	const trimmed = raw.trim();
	if (!trimmed) return "Untitled";

	const stripped = trimmed.replace(/^\s*\d+\.\s*/u, "").trim();
	if (!stripped) return trimmed;

	return stripped
		.split(/\s+/u)
		.map((w) =>
			w.toUpperCase() === w ? w : w.charAt(0).toUpperCase() + w.slice(1),
		)
		.join(" ");
}
