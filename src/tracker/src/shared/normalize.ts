// file: tracker/src/shared/normalize.ts

import type { Difficulty } from "./types";

export function normalizeProblemLink(raw: string): string {
	const s = raw.trim();
	try {
		const u = new URL(s);
		u.hash = "";
		u.search = "";
		const out = u.toString();
		return out.endsWith("/") ? out.slice(0, -1) : out;
	} catch {
		const noHash = s.split("#")[0] ?? "";
		const noQuery = (noHash.split("?")[0] ?? "").trim();
		return noQuery.endsWith("/") ? noQuery.slice(0, -1) : noQuery;
	}
}

export function parseDifficulty(input: string): Difficulty {
	const t = input.trim().toUpperCase();
	if (t.includes("EASY")) return "EASY";
	if (t.includes("MEDIUM")) return "MEDIUM";
	if (t.includes("HARD")) return "HARD";
	return "UNKNOWN";
}

export function fmtMinutes(elapsedSec: number): string {
	const m = elapsedSec / 60;
	return (Math.round(m * 10) / 10).toFixed(1);
}
