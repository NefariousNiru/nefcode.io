// file: src/pages/FilePreviewPage.tsx

import { ExternalLink, Filter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadCsv } from "../data/csv";
import { formatListLabel } from "../domain/normalize";
import type { Difficulty, ProblemRow } from "../domain/types";
import { upsertRecentFile } from "../storage/prefs";

type LoadState =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| {
			readonly kind: "ready";
			readonly items: readonly ProblemRow[];
			readonly issuesCount: number;
	  };

function difficultyClass(d: Difficulty): string {
	const base = "chip px-3 py-1 text-xs font-medium";
	if (d === "EASY") return `${base} text-[rgba(34,197,94,0.95)]`;
	if (d === "MEDIUM") return `${base} text-[rgba(245,158,11,0.95)]`;
	return `${base} text-[rgba(239,68,68,0.95)]`;
}

function formatAcceptance(v: number | null): string {
	if (v === null) return "-";
	const pct = Math.round(v * 1000) / 10;
	return `${pct}%`;
}

function formatFreq(v: number): string {
	if (!Number.isFinite(v)) return "-";
	return v >= 1000 ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`;
}

export function FilePreviewPage() {
	const [sp] = useSearchParams();

	const company = sp.get("company")
		? decodeURIComponent(sp.get("company") as string)
		: "Company";
	const labelRaw = sp.get("label")
		? decodeURIComponent(sp.get("label") as string)
		: "List";
	const url = sp.get("url") ? decodeURIComponent(sp.get("url") as string) : "";

	const label = formatListLabel(labelRaw);

	const [query, setQuery] = useState("");
	const [state, setState] = useState<LoadState>({ kind: "loading" });

	// Track "recently opened" safely (do not run during render).
	useEffect(() => {
		if (!url) return;
		try {
			upsertRecentFile({ company, label: labelRaw, url }, 10);
		} catch {
			// ignore
		}
	}, [company, labelRaw, url]);

	useEffect(() => {
		const ac = new AbortController();

		if (!url) {
			setState({ kind: "error", message: "Missing CSV url in query params." });
			return () => ac.abort();
		}

		setState({ kind: "loading" });

		loadCsv(url, ac.signal)
			.then((res) => {
				setState({
					kind: "ready",
					items: res.items,
					issuesCount: res.issuesCount,
				});
			})
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, [url]);

	const filtered = useMemo(() => {
		if (state.kind !== "ready") return [];
		const q = query.trim().toLowerCase();
		if (!q) return state.items;

		return state.items.filter((r) => {
			if (r.title.toLowerCase().includes(q)) return true;
			if (r.difficulty.toLowerCase().includes(q)) return true;
			if (r.link.toLowerCase().includes(q)) return true;
			return r.topics.some((t) => t.toLowerCase().includes(q));
		});
	}, [state, query]);

	const shown = state.kind === "ready" ? filtered.slice(0, 200) : [];

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div className="glass p-6">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<div className="chip inline-flex px-3 py-1 text-xs">
								{state.kind === "ready"
									? `${state.items.length} rows • ${state.issuesCount} issues`
									: "Loading..."}
							</div>

							<h1 className="mt-3 truncate text-2xl font-semibold tracking-tight">
								{company} - {label}
							</h1>

							<div className="muted mt-1 truncate text-sm">{url || "-"}</div>
						</div>

						<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
							<div className="relative w-full sm:w-[360px]">
								<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
								<input
									className="input pl-11"
									placeholder="Search title, topic, link..."
									value={query}
									onChange={(e) => setQuery(e.target.value)}
								/>
							</div>

							<button type="button" className="btn" aria-label="Filters (stub)">
								<Filter className="h-4 w-4" />
								Filters
							</button>
						</div>
					</div>
				</div>

				{state.kind === "loading" ? (
					<div className="card p-6">
						<div className="text-base font-semibold">Loading CSV...</div>
						<div className="muted mt-2 text-sm">
							Fetching {import.meta.env.BASE_URL}
							{url}
						</div>
					</div>
				) : null}

				{state.kind === "error" ? (
					<div className="card p-6">
						<div className="text-base font-semibold">Failed to load CSV</div>
						<div className="muted mt-2 text-sm">{state.message}</div>
					</div>
				) : null}

				{state.kind === "ready" ? (
					<>
						<div className="card overflow-hidden">
							<div className="grid grid-cols-1 gap-0 border-b border-[rgb(var(--border))] p-4 md:grid-cols-[120px_1fr_110px_110px_240px_120px] md:items-center">
								<div className="muted text-xs font-medium">Difficulty</div>
								<div className="muted text-xs font-medium">Title</div>
								<div className="muted text-xs font-medium">Acceptance</div>
								<div className="muted text-xs font-medium">Frequency</div>
								<div className="muted hidden text-xs font-medium md:block">
									Topics
								</div>
								<div className="muted hidden text-xs font-medium md:block">
									Link
								</div>
							</div>

							<div className="divide-y divide-[rgb(var(--border))]">
								{shown.map((r) => (
									<div
										key={r.link}
										className="grid grid-cols-1 gap-3 p-4 md:grid-cols-[120px_1fr_110px_110px_240px_120px] md:items-center"
									>
										<div className={difficultyClass(r.difficulty)}>
											{r.difficulty}
										</div>

										<div className="min-w-0">
											<div className="truncate font-medium">{r.title}</div>
											<div className="muted mt-1 text-xs md:hidden">
												{r.topics.length ? r.topics.join(", ") : "-"}
											</div>
										</div>

										<div className="muted text-sm">
											{formatAcceptance(r.acceptanceRate)}
										</div>
										<div className="muted text-sm">
											{formatFreq(r.frequency)}
										</div>

										<div className="hidden md:block">
											<div className="muted text-xs line-clamp-2">
												{r.topics.length ? r.topics.join(", ") : "-"}
											</div>
										</div>

										<div className="hidden md:block">
											<a
												className="btn"
												href={r.link}
												target="_blank"
												rel="noreferrer"
												aria-label="Open on LeetCode"
											>
												<ExternalLink className="h-4 w-4" />
												Open
											</a>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="muted text-sm leading-6">
							Showing {shown.length} of {filtered.length} filtered rows.
							{filtered.length > 200 ? " (capped at 200 for now)" : ""}
							{state.issuesCount > 0
								? ` • ${state.issuesCount} invalid rows dropped`
								: ""}
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
