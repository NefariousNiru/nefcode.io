// file: src/storage/useProgressMap.ts

import { liveQuery } from "dexie";
import { useEffect, useMemo, useState } from "react";
import type { ProblemProgress } from "./db";
import { getProgressMap } from "./progress";

/**
 * useProgressMap
 * Purpose:
 * - Subscribe to progress for a set of links.
 * - Keeps UI in sync when toggles happen.
 *
 * Inputs:
 * - links: list of primary keys (stable, preferably memoized).
 *
 * Output:
 * - Map<link, progress>
 *
 * Notes:
 * - Uses Dexie liveQuery, no extra deps.
 */
export function useProgressMap(
	links: readonly string[],
): Map<string, ProblemProgress> {
	const stableLinks = useMemo(() => [...links], [links]);
	const [map, setMap] = useState<Map<string, ProblemProgress>>(new Map());

	useEffect(() => {
		let active = true;

		const obs = liveQuery(async () => getProgressMap(stableLinks));
		const sub = obs.subscribe({
			next: (m) => {
				if (!active) return;
				setMap(m);
			},
			error: () => {
				if (!active) return;
				setMap(new Map());
			},
		});

		return () => {
			active = false;
			sub.unsubscribe();
		};
	}, [stableLinks]);

	return map;
}
