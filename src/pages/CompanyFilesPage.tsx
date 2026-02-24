// file: src/pages/CompanyFilesPage.tsx

import { ArrowRight, FileText, Pin, PinOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchManifest } from "../data/manifest";
import { formatListLabel } from "../domain/normalize";
import type { ManifestCompany, ManifestFile } from "../domain/types";
import { usePinnedCompanies } from "../hooks/usePinnedCompanies";
import { getCompanyFileQuickStats } from "../stats/companyFileQuickStats";
import { getCompanyStats } from "../stats/companyStats";
import { clampPins, withConcurrency } from "../utils/functions";

type LoadStateCompany =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| {
			readonly kind: "ready";
			readonly company: ManifestCompany;
			readonly manifestAt: string;
	  };

type SolvedTotal = { readonly solved: number; readonly total: number };

export function CompanyFilesPage() {
	const { company: companyParam } = useParams();
	const companyName = companyParam ? decodeURIComponent(companyParam) : "";

	const [state, setState] = useState<LoadStateCompany>({ kind: "loading" });
	const [sp] = useSearchParams();
	const filter = (sp.get("q") ?? "").trim().toLowerCase();

	const [overallStats, setOverallStats] = useState<{
		readonly kind: "idle" | "loading" | "ready";
		readonly stats: null | {
			readonly easy: SolvedTotal;
			readonly medium: SolvedTotal;
			readonly hard: SolvedTotal;
			readonly total: SolvedTotal;
		};
	}>({ kind: "idle", stats: null });

	const [fileStats, setFileStats] = useState<Map<string, SolvedTotal>>(
		() => new Map(),
	);

	useEffect(() => {
		if (!companyName) {
			setState({ kind: "error", message: "Missing company in route." });
			return;
		}

		const ac = new AbortController();
		setState({ kind: "loading" });

		fetchManifest(ac.signal)
			.then((m) => {
				if (ac.signal.aborted) return;

				const found = m.companies.find((c) => c.name === companyName);
				if (!found) {
					setState({
						kind: "error",
						message: `Company not found in manifest: ${companyName}`,
					});
					return;
				}

				// IMPORTANT: must be non-empty for versioned caches
				const manifestAt = m.generatedAt || "dev";
				setState({ kind: "ready", company: found, manifestAt });
			})
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, [companyName]);

	const { pinned, pinnedSet, setPinned } = usePinnedCompanies();
	const isPinned = pinnedSet.has(companyName);
	const pinDisabled = !!companyName && !isPinned && pinnedSet.size >= 5;

	const togglePin = () => {
		if (!companyName) return;

		const pinnedArr = [...pinned];
		const next = pinnedSet.has(companyName)
			? pinnedArr.filter((x) => x !== companyName)
			: clampPins([companyName, ...pinnedArr]);

		setPinned(next);
	};

	const files: readonly ManifestFile[] = useMemo(() => {
		if (state.kind !== "ready") return [];
		if (!filter) return state.company.files;
		return state.company.files.filter((f) =>
			f.name.toLowerCase().includes(filter),
		);
	}, [state, filter]);

	// Overall company stats (easy/med/hard/total) for sidebar
	useEffect(() => {
		if (state.kind !== "ready") return;

		const ac = new AbortController();
		setOverallStats({ kind: "loading", stats: null });

		getCompanyStats({
			manifestAt: state.manifestAt,
			company: state.company,
			signal: ac.signal,
		})
			.then((st) => {
				if (ac.signal.aborted) return;
				setOverallStats({ kind: "ready", stats: st });
			})
			.catch(() => {
				if (ac.signal.aborted) return;
				setOverallStats({ kind: "ready", stats: null });
			});

		return () => ac.abort();
	}, [state]);

	// Per-file quick stats (solved/total) for sidebar + optionally per-row later
	useEffect(() => {
		if (state.kind !== "ready") return;

		const ac = new AbortController();
		setFileStats(new Map());

		const run = async () => {
			const next = new Map<string, SolvedTotal>();

			// Compute only for filtered files (the ones on screen)
			await withConcurrency(files, 3, async (f) => {
				if (ac.signal.aborted) return;

				try {
					const st = await getCompanyFileQuickStats({
						manifestAt: state.manifestAt,
						companyName: state.company.name,
						listUrl: f.url,
						signal: ac.signal,
					});

					next.set(f.url, st);

					// incremental paint
					setFileStats((prev) => {
						const merged = new Map(prev);
						merged.set(f.url, st);
						return merged;
					});
				} catch {
					// ignore per-file failures
				}
			});
		};

		void run();
		return () => ac.abort();
	}, [state, files]);

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-3">
							<h1 className="truncate text-3xl font-semibold tracking-tight">
								{companyName || "Company"}
							</h1>

							<button
								type="button"
								className={`btn ${pinDisabled ? "opacity-50" : ""}`}
								onClick={() => {
									if (pinDisabled) return;
									togglePin();
								}}
								aria-label={isPinned ? "Unpin company" : "Pin company"}
								title={pinDisabled ? "Pin limit reached (5)" : ""}
							>
								{isPinned ? (
									<PinOff className="h-4 w-4" />
								) : (
									<Pin className="h-4 w-4" />
								)}
								<span className="hidden sm:inline">
									{isPinned ? "Unpin" : "Pin"}
								</span>
							</button>
						</div>

						<p className="muted mt-1">Choose a list to preview.</p>
					</div>

					<div className="flex gap-2">
						<Link to="/companies" className="btn">
							Back
						</Link>
					</div>
				</div>

				{state.kind === "loading" ? (
					<div className="glass p-6">
						<div className="text-base font-semibold">Loading lists...</div>
						<div className="muted mt-2 text-sm">Fetching data</div>
					</div>
				) : null}

				{state.kind === "error" ? (
					<div className="glass p-6">
						<div className="text-base font-semibold">Failed to load lists</div>
						<div className="muted mt-2 text-sm">{state.message}</div>
					</div>
				) : null}

				{state.kind === "ready" ? (
					<div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
						{/* Lists */}
						<div className="card p-6">
							<div className="flex items-center justify-between">
								<div className="text-base font-semibold">Lists</div>
								<div className="chip px-3 py-1 text-xs">
									{files.length} found
								</div>
							</div>

							<div className="mt-4 space-y-3">
								{files.map((f) => (
									<div
										key={f.url}
										className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] p-4"
									>
										<div className="min-w-0">
											<div className="flex items-center gap-2">
												<FileText className="h-4 w-4 opacity-80" />
												<div className="truncate font-medium">
													{formatListLabel(f.name)}
												</div>
											</div>
										</div>

										<Link
											to={`/preview?company=${encodeURIComponent(
												state.company.name,
											)}&label=${encodeURIComponent(f.name)}&url=${encodeURIComponent(f.url)}`}
											className="btn btn-primary"
										>
											Open <ArrowRight className="h-4 w-4" />
										</Link>
									</div>
								))}
							</div>
						</div>

						{/* Quick stats */}
						<div className="qs-card p-6">
							<div className="flex items-start justify-between gap-3">
								<div className="flex items-start gap-3">
									<div className="qs-badge">
										{/* tiny visual glyph */}
										<span className="h-2.5 w-2.5 rounded-full bg-[rgba(99,102,241,0.85)]" />
									</div>
									<div>
										<div className="text-base font-semibold">Quick stats</div>
										<div className="muted mt-1 text-xs">
											Progress across this company and its lists
										</div>
									</div>
								</div>

								<div className="qs-pill">
									{overallStats.kind === "loading" ? (
										<span className="qs-pill-muted">Computing…</span>
									) : (
										<span className="qs-pill-muted">Status</span>
									)}
								</div>
							</div>

							{/* Overall tiles */}
							<div className="mt-5">
								{overallStats.kind === "loading" ? (
									<div className="muted text-sm">Computing…</div>
								) : overallStats.stats ? (
									<div className="grid grid-cols-2 gap-2">
										<div className="qs-tile qs-easy">
											<div className="qs-tile-title">Easy</div>
											<div className="qs-tile-value">
												{overallStats.stats.easy.solved}/
												{overallStats.stats.easy.total}
											</div>
											<div className="qs-tile-sub">Solved</div>
										</div>

										<div className="qs-tile qs-medium">
											<div className="qs-tile-title">Medium</div>
											<div className="qs-tile-value">
												{overallStats.stats.medium.solved}/
												{overallStats.stats.medium.total}
											</div>
											<div className="qs-tile-sub">Solved</div>
										</div>

										<div className="qs-tile qs-hard">
											<div className="qs-tile-title">Hard</div>
											<div className="qs-tile-value">
												{overallStats.stats.hard.solved}/
												{overallStats.stats.hard.total}
											</div>
											<div className="qs-tile-sub">Solved</div>
										</div>

										<div className="qs-tile qs-total">
											<div className="qs-tile-title">Total</div>
											<div className="qs-tile-value">
												{overallStats.stats.total.solved}/
												{overallStats.stats.total.total}
											</div>
											<div className="qs-tile-sub">Across all lists</div>
										</div>
									</div>
								) : (
									<div className="muted text-sm">No stats yet.</div>
								)}
							</div>

							<div className="my-6 qs-divider" />

							{/* Per-list */}
							<div className="flex items-center justify-between">
								<div className="text-sm font-semibold">Lists</div>
							</div>

							<div className="mt-3 space-y-2">
                                {files.slice(0, 8).map((f) => {
                                    const st = fileStats.get(f.url);
                                    const solved = st?.solved ?? 0;
                                    const total = st?.total ?? 0;

                                    const pctRaw = total > 0 ? (solved / total) * 100 : 0;
                                    const pct = solved > 0 && total > 0 ? Math.max(pctRaw, 2) : 0;

                                    return (
                                        <div key={f.url} className="qs-row">
                                            {/* Row 1: title left, x/y pill right */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="truncate text-sm font-medium">
                                                        {formatListLabel(f.name)}
                                                    </div>
                                                </div>

                                                <div className="qs-pill shrink-0">
                                                    {st ? (
                                                        <span className="font-semibold">{solved}/{total}</span>
                                                    ) : (
                                                        <span className="qs-pill-muted">…</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Row 2: progress bar full width */}
                                            <div className="qs-bar w-full">
                                                <div style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}

								{files.length > 8 ? (
									<div className="muted text-xs">
										Showing 8 of {files.length}. Use search to narrow.
									</div>
								) : null}
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
