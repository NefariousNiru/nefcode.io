// file: src/data/videoSolutions.ts

import Papa from "papaparse";

/**
 * Raw CSV row as parsed by PapaParse.
 * Keys are header names; values are raw cell strings.
 */
type VideoCsvRowRaw = Record<string, string | undefined>;

/**
 * Immutable video index exposed to the application.
 */
export type VideoSolutionIndex = {
	/**
	 * Exact lookup against any dash-split segment from the CSV title cell.
	 * Returns a video URL if a match is found.
	 */
	readonly findVideoUrl: (problemTitle: string) => string | null;

	/**
	 * Index statistics for diagnostics / debugging.
	 */
	readonly stats: {
		readonly totalVideos: number;
		readonly uniqueKeys: number;
	};
};

/**
 * Relative location of the NeetCode CSV inside public assets.
 */
const VIDEO_CSV_RELATIVE_URL = "data/__global/neetcode.csv";

/**
 * Module-level cache to ensure the CSV is fetched only once per session.
 */
let cachedPromise: Promise<VideoSolutionIndex> | null = null;

export function loadVideoSolutionIndex(
	signal?: AbortSignal,
): Promise<VideoSolutionIndex> {
	if (!cachedPromise) cachedPromise = fetchAndBuildIndex(signal);
	return cachedPromise;
}

async function fetchCsvText(signal?: AbortSignal): Promise<string> {
	const base = import.meta.env.BASE_URL;
	const res = await fetch(`${base}${VIDEO_CSV_RELATIVE_URL}`, { signal });
	if (!res.ok) {
		throw new Error(
			`Failed to fetch video CSV: ${VIDEO_CSV_RELATIVE_URL} (${res.status} ${res.statusText})`,
		);
	}
	return res.text();
}

function normalizeHeader(h: string): string {
	return h.trim().toLowerCase().replace(/\s+/gu, " ");
}

/**
 * Extract the first matching field from a row using acceptable header names.
 * Matching is header-normalized and case-insensitive.
 */
function getField(
	row: VideoCsvRowRaw,
	wanted: readonly string[],
): string | null {
	for (const k of Object.keys(row)) {
		const nk = normalizeHeader(k);
		for (const w of wanted) {
			if (nk === w) {
				const v = row[k];
				const s = typeof v === "string" ? v.trim() : "";
				return s || null;
			}
		}
	}
	return null;
}

/**
 * Normalize a segment for exact matching.
 * Intentionally simple:
 * - lowercase
 * - trim
 * - collapse whitespace
 * - drop non-alphanumeric (keep spaces)
 */
function normalizeKey(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s]+/gu, " ")
		.replace(/\s+/gu, " ")
		.trim();
}

/**
 * Split a title cell into dash-separated segments.
 * Uses a greedy split on '-' with optional surrounding whitespace.
 */
function splitDashSegments(rawTitle: string): readonly string[] {
	return rawTitle
		.split(/\s*-\s*/gu)
		.map((p) => p.trim())
		.filter((p) => p.length > 0);
}

async function fetchAndBuildIndex(
	signal?: AbortSignal,
): Promise<VideoSolutionIndex> {
	const csvText = await fetchCsvText(signal);

	const parsed = Papa.parse<VideoCsvRowRaw>(csvText, {
		header: true,
		skipEmptyLines: "greedy",
		dynamicTyping: false,
	});

	// Map any normalized segment -> url
	const bySegment = new Map<string, string>();

	let totalVideos = 0;

	for (const r of parsed.data) {
		const rawTitle =
			getField(r, ["title", "problem", "problem title"]) ??
			getField(r, ["name"]) ??
			null;

		const url =
			getField(r, ["url", "video", "video link", "video solution", "link"]) ??
			null;

		if (!rawTitle || !url) continue;

		totalVideos += 1;

		const segments = splitDashSegments(rawTitle);

		// Index every segment so lookups can match on any part:
		// promo prefix, problem title, "leetcode 1423", language, etc.
		for (const seg of segments) {
			const k = normalizeKey(seg);
			if (!k) continue;

			// Keep first mapping for stability in case of duplicates.
			if (!bySegment.has(k)) bySegment.set(k, url);
		}
	}

	return {
		findVideoUrl: (problemTitle: string) => {
			const q = normalizeKey(problemTitle);
			if (!q) return null;
			return bySegment.get(q) ?? null;
		},
		stats: { totalVideos, uniqueKeys: bySegment.size },
	};
}
