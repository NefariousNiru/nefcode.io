// file: src/hooks/useCompanyStatsLazy.ts

import { useEffect, useMemo, useRef, useState } from "react";
import { withConcurrency } from "../utils/functions.ts";
import {
	type CachedCompanyStats,
	readCompanyCache,
	writeCompanyCache,
} from "./companyCache";
import { computeCompanyStats } from "./companyStats"; // adjust import if your file path differs
import type { ManifestCompany } from "./types.ts";

type MapStats = ReadonlyMap<string, CachedCompanyStats>;

function toCached(stats: {
	readonly easy: { readonly solved: number; readonly total: number };
	readonly medium: { readonly solved: number; readonly total: number };
	readonly hard: { readonly solved: number; readonly total: number };
	readonly total: { readonly solved: number; readonly total: number };
}): CachedCompanyStats {
	return {
		easy: { solved: stats.easy.solved, total: stats.easy.total },
		medium: { solved: stats.medium.solved, total: stats.medium.total },
		hard: { solved: stats.hard.solved, total: stats.hard.total },
		total: { solved: stats.total.solved, total: stats.total.total },
	};
}

/**
 * Lazily compute company stats for only the visible companies.
 *
 * Design:
 * - cache key is (manifestAt, company.name)
 * - prefer cache, compute only missing
 * - progressive state updates
 */
export function useCompanyStatsLazy(args: {
	readonly manifestAt: string;
	readonly companies: readonly ManifestCompany[];
	readonly visibleCompanyNames: readonly string[];
}): {
	readonly statsByCompany: MapStats;
} {
	const { manifestAt, companies, visibleCompanyNames } = args;

	const companiesByName = useMemo(() => {
		const m = new Map<string, ManifestCompany>();
		for (const c of companies) m.set(c.name, c);
		return m;
	}, [companies]);

	const [statsByCompany, setStatsByCompany] = useState<MapStats>(
		() => new Map(),
	);

	// Prevent duplicate work in-flight
	const inFlightRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!manifestAt) return;
		if (visibleCompanyNames.length === 0) return;

		const ac = new AbortController();
		const visible = [...new Set(visibleCompanyNames)];

		const run = async () => {
			// First: load cache for all visible
			await withConcurrency(visible, 6, async (name) => {
				if (ac.signal.aborted) return;

				const cached = await readCompanyCache(manifestAt, name);
				if (!cached) return;

				setStatsByCompany((prev) => {
					if (prev.has(name)) return prev;
					const next = new Map(prev);
					next.set(name, cached);
					return next;
				});
			});

			// Second: compute missing
			await withConcurrency(visible, 2, async (name) => {
				if (ac.signal.aborted) return;

				// already have it
				if (statsByCompany.has(name)) return;

				// de-dupe in-flight
				const key = `${manifestAt}::${name}`;
				if (inFlightRef.current.has(key)) return;
				inFlightRef.current.add(key);

				try {
					const company = companiesByName.get(name);
					if (!company) return;

					const computed = await computeCompanyStats({
						company,
						signal: ac.signal,
					});

					if (ac.signal.aborted) return;

					const cached = toCached(computed);
					await writeCompanyCache({ manifestAt, company: name, stats: cached });

					setStatsByCompany((prev) => {
						const next = new Map(prev);
						next.set(name, cached);
						return next;
					});
				} finally {
					inFlightRef.current.delete(key);
				}
			});
		};

		void run();
		return () => ac.abort();
	}, [manifestAt, companiesByName, visibleCompanyNames, statsByCompany]);

	return { statsByCompany };
}
