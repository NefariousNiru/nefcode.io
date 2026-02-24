// file: src/hooks/useCompanyStatsLazy.ts

import { useEffect, useMemo, useRef, useState } from "react";
import type { ManifestCompany } from "../domain/types";
import { getCompanyStats } from "../stats/companyStats";
import type { CachedCompanyStats } from "../storage/companyCache";
import { withConcurrency } from "../utils/functions";

type MapStats = ReadonlyMap<string, CachedCompanyStats>;

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

	// De-dupe work: (manifestAt, companyName)
	const inFlightRef = useRef<Set<string>>(new Set());

	// Only clear when manifest changes (not on scroll/visibility changes)
	const lastManifestRef = useRef<string>("");

	useEffect(() => {
		if (!manifestAt) return;

		if (lastManifestRef.current !== manifestAt) {
			lastManifestRef.current = manifestAt;
			inFlightRef.current.clear();
			setStatsByCompany(new Map());
		}
	}, [manifestAt]);

	useEffect(() => {
		if (!manifestAt) return;
		if (visibleCompanyNames.length === 0) return;

		const ac = new AbortController();
		const visible = [...new Set(visibleCompanyNames)];

		const run = async () => {
			// Compute only for visible companies, bounded concurrency
			await withConcurrency(visible, 2, async (name) => {
				if (ac.signal.aborted) return;

				const company = companiesByName.get(name);
				if (!company) return;

				const key = `${manifestAt}::${name}`;
				if (inFlightRef.current.has(key)) return;
				inFlightRef.current.add(key);

				try {
					const stats = await getCompanyStats({
						manifestAt,
						company,
						signal: ac.signal,
					});

					if (ac.signal.aborted) return;

					// Avoid pointless re-renders if we already have it
					setStatsByCompany((prev) => {
						if (prev.has(name)) return prev;
						const next = new Map(prev);
						next.set(name, stats);
						return next;
					});
				} finally {
					inFlightRef.current.delete(key);
				}
			});
		};

		void run();
		return () => ac.abort();
	}, [manifestAt, companiesByName, visibleCompanyNames]);

	return { statsByCompany };
}
