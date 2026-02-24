// file: src/hooks/useGlobalSearch.ts

import { useEffect, useRef, useState } from "react";
import { fetchManifest } from "../data/manifest";
import type { Manifest, ManifestCompany, ManifestFile } from "../domain/types";
import { db } from "../storage/db";
import { prettyProblemLink } from "../utils/functions.ts";

export type SearchResult =
	| {
			readonly kind: "company";
			readonly key: string;
			readonly company: string;
			readonly to: string;
	  }
	| {
			readonly kind: "list";
			readonly key: string;
			readonly company: string;
			readonly listLabel: string;
			readonly listUrl: string;
			readonly to: string;
	  }
	| {
			readonly kind: "problem";
			readonly key: string;
			readonly title: string;
			readonly link: string;
			readonly difficulty: "EASY" | "MEDIUM" | "HARD";
			readonly completed: boolean;
	  };

type ManifestIndex = {
	readonly companies: readonly ManifestCompany[];
	readonly lists: readonly {
		readonly company: string;
		readonly file: ManifestFile;
	}[];
};

function normalizeQ(q: string): string {
	return q.trim().toLowerCase();
}

async function buildManifestIndex(signal: AbortSignal): Promise<{
	readonly manifestAt: string;
	readonly index: ManifestIndex;
}> {
	const m: Manifest = await fetchManifest(signal);

	const lists: Array<{ company: string; file: ManifestFile }> = [];
	for (const c of m.companies) {
		for (const f of c.files) lists.push({ company: c.name, file: f });
	}

	return {
		manifestAt: m.generatedAt || "dev",
		index: { companies: m.companies, lists },
	};
}

export function useGlobalSearch(): {
	readonly query: string;
	readonly setQuery: (q: string) => void;
	readonly open: boolean;
	readonly setOpen: (v: boolean) => void;
	readonly loading: boolean;
	readonly results: readonly SearchResult[];
	readonly manifestAt: string;
	readonly clear: () => void;
} {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [manifestAt, setManifestAt] = useState("");

	const indexRef = useRef<ManifestIndex | null>(null);
	const manifestLoadedRef = useRef(false);

	const [results, setResults] = useState<readonly SearchResult[]>([]);

	// Load manifest once (lazy)
	useEffect(() => {
		if (!open) return;
		if (manifestLoadedRef.current) return;

		const ac = new AbortController();
		setLoading(true);

		buildManifestIndex(ac.signal)
			.then(({ manifestAt, index }) => {
				if (ac.signal.aborted) return;
				manifestLoadedRef.current = true;
				indexRef.current = index;
				setManifestAt(manifestAt);
			})
			.catch(() => {
				if (ac.signal.aborted) return;
				manifestLoadedRef.current = true;
				indexRef.current = { companies: [], lists: [] };
				setManifestAt("dev");
			})
			.finally(() => {
				if (ac.signal.aborted) return;
				setLoading(false);
			});

		return () => ac.abort();
	}, [open]);

	// Debounced search
	useEffect(() => {
		if (!open) return;

		const handle = window.setTimeout(() => {
			const run = async () => {
				const nq = normalizeQ(query);
				if (!nq) {
					setResults([]);
					return;
				}

				setLoading(true);

				try {
					const idx = indexRef.current ?? { companies: [], lists: [] };

					// Companies
					const companies = idx.companies
						.filter((c) => c.name.toLowerCase().includes(nq))
						.slice(0, 8)
						.map<SearchResult>((c) => ({
							kind: "company",
							key: `company:${c.name}`,
							company: c.name,
							to: `/companies/${encodeURIComponent(c.name)}`,
						}));

					// Lists (company files)
					const lists = idx.lists
						.filter((x) => {
							const name = x.file.name.toLowerCase();
							const company = x.company.toLowerCase();
							return name.includes(nq) || company.includes(nq);
						})
						.slice(0, 8)
						.map<SearchResult>((x) => ({
							kind: "list",
							key: `list:${x.company}:${x.file.url}`,
							company: x.company,
							listLabel: x.file.name,
							listUrl: x.file.url,
							to: `/preview?company=${encodeURIComponent(
								x.company,
							)}&label=${encodeURIComponent(x.file.name)}&url=${encodeURIComponent(
								x.file.url,
							)}`,
						}));

					// Problems from Dexie progress only (things user touched)
					const progressRows = await db.progress.toArray();
					const problems = progressRows
						.map<SearchResult>((r) => ({
							kind: "problem",
							key: `problem:${r.link}`,
							title: prettyProblemLink(r.link),
							link: r.link,
							difficulty: r.difficulty,
							completed: r.completed,
						}))
						.filter((p) => {
							if (p.kind !== "problem") return false;
							return (
								p.title.toLowerCase().includes(nq) ||
								p.link.toLowerCase().includes(nq)
							);
						})
						.slice(0, 10);

					setResults([...companies, ...lists, ...problems]);
				} catch {
					setResults([]);
				} finally {
					setLoading(false);
				}
			};

			void run();
		}, 150);

		return () => window.clearTimeout(handle);
	}, [open, query]);

	const clear = () => {
		setQuery("");
		setResults([]);
	};

	return {
		query,
		setQuery,
		open,
		setOpen,
		loading,
		results,
		manifestAt,
		clear,
	};
}
