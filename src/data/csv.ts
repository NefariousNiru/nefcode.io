// file: src/data/csv.ts

import Papa from "papaparse";
import { normalizeProblemRows } from "../domain/normalize";
import type { CsvRowRaw, ProblemRow } from "../domain/types";

export type CsvLoadResult = {
	readonly items: readonly ProblemRow[];
	readonly issuesCount: number;
};

/**
 * Fetch a CSV from GitHub Pages using Vite BASE_URL.
 * Input urlRelative must be relative (no leading slash), e.g. "data/Amazon/5.%20All.csv".
 */
export async function fetchCsvText(
	urlRelative: string,
	signal?: AbortSignal,
): Promise<string> {
	const base = import.meta.env.BASE_URL;
	const res = await fetch(`${base}${urlRelative}`, { signal });
	if (!res.ok) {
		throw new Error(
			`Failed to fetch CSV: ${urlRelative} (${res.status} ${res.statusText})`,
		);
	}
	return res.text();
}

/**
 * Parse CSV into typed ProblemRow items.
 * Invariants:
 * - rows are normalized and validated; invalid rows are dropped and counted in issuesCount.
 */
export function parseAndNormalizeCsv(csvText: string): CsvLoadResult {
	const parsed = Papa.parse<CsvRowRaw>(csvText, {
		header: true,
		skipEmptyLines: "greedy",
		dynamicTyping: false,
	});

	if (parsed.errors.length > 0) {
		// Treat parser errors as issues, but still try to salvage parsed data.
	}

	const rows = parsed.data;
	const { items, issues } = normalizeProblemRows(rows);

	return {
		items,
		issuesCount: issues.length + parsed.errors.length,
	};
}

/**
 * Convenience: fetch + parse + normalize.
 */
export async function loadCsv(
	urlRelative: string,
	signal?: AbortSignal,
): Promise<CsvLoadResult> {
	const text = await fetchCsvText(urlRelative, signal);
	return parseAndNormalizeCsv(text);
}
