// file: src/pages/FilePreviewPage.tsx

import { ExternalLink, Eye, EyeOff, Search, Video } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { loadCsv } from "../data/csv";
import { loadVideoSolutionIndex } from "../data/videoSolutions";
import { formatListLabel } from "../domain/normalize";
import type { Difficulty, ProblemRow } from "../domain/types";
import { upsertRecentFile } from "../storage/prefs";
import { toggleCompleted } from "../storage/progress";
import { useProgressMap } from "../storage/useProgressMap";
import { difficultyClass } from "../utils/functions";

type LoadState =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| {
			readonly kind: "ready";
			readonly items: readonly ProblemRow[];
			readonly issuesCount: number;
	  };

type RowWithVideo = ProblemRow & { readonly videoUrl: string | null };

function formatAcceptance(v: number | null): string {
	if (v === null) return "-";
	const pct = Math.round(v * 1000) / 10;
	return `${pct}%`;
}

function formatFreq(v: number): string {
	if (!Number.isFinite(v)) return "-";
	return v >= 1000 ? `${Math.round(v)}` : `${Math.round(v * 10) / 10}`;
}

function difficultyLabel(d: Difficulty): string {
	if (d === "EASY") return "Easy";
	if (d === "MEDIUM") return "Medium";
	return "Hard";
}

function rowDoneClass(done: boolean): string {
	return done
		? "bg-[rgba(99,102,241,0.10)] dark:bg-[rgba(99,102,241,0.16)]"
		: "";
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
	const [showTopics, setShowTopics] = useState(false);
	const [state, setState] = useState<LoadState>({ kind: "loading" });

	const [videoIndexReady, setVideoIndexReady] = useState(false);
	const [videoMap, setVideoMap] = useState<Map<string, string | null>>(
		() => new Map(),
	);

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
				if (ac.signal.aborted) return;
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

	useEffect(() => {
		const ac = new AbortController();

		setVideoIndexReady(false);
		setVideoMap(new Map());

		if (state.kind !== "ready") return () => ac.abort();

		loadVideoSolutionIndex(ac.signal)
			.then((idx) => {
				if (ac.signal.aborted) return;

				const m = new Map<string, string | null>();
				for (const r of state.items) {
					m.set(r.link, idx.findVideoUrl(r.title));
				}
				setVideoMap(m);
				setVideoIndexReady(true);
			})
			.catch(() => {
				if (ac.signal.aborted) return;
				setVideoIndexReady(false);
				setVideoMap(new Map());
			});

		return () => ac.abort();
	}, [state]);

	const filtered: readonly RowWithVideo[] = useMemo(() => {
		if (state.kind !== "ready") return [];
		const q = query.trim().toLowerCase();
		const items = state.items;

		const rows: RowWithVideo[] = items.map((r) => ({
			...r,
			videoUrl: videoMap.get(r.link) ?? null,
		}));

		if (!q) return rows;

		return rows.filter((r) => {
			if (r.title.toLowerCase().includes(q)) return true;
			if (r.difficulty.toLowerCase().includes(q)) return true;
			if (r.link.toLowerCase().includes(q)) return true;
			if (showTopics && r.topics.some((t) => t.toLowerCase().includes(q)))
				return true;
			return false;
		});
	}, [state, query, videoMap, showTopics]);

	const shown = state.kind === "ready" ? filtered.slice(0, 200) : [];

	const links = useMemo(() => {
		if (state.kind !== "ready") return [];
		return filtered.map((r) => r.link);
	}, [state, filtered]);

	const progressMap = useProgressMap(links);

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div className="glass p-6">
					<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
						<div className="min-w-0">
							<h1 className="my-2 truncate text-2xl font-semibold tracking-tight">
								{company} - {label}
							</h1>
							<div className="chip inline-flex px-3 text-xs">
								{state.kind === "ready"
									? `${state.items.length} problems`
									: "Loading..."}
							</div>
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

							<button
								type="button"
								className="btn btn-ghost"
								aria-label={showTopics ? "Hide topics" : "Show topics"}
								aria-pressed={showTopics}
								onClick={() => setShowTopics((v) => !v)}
								title={showTopics ? "Hide topics" : "Show topics"}
							>
								{showTopics ? (
									<EyeOff className="h-4 w-4" />
								) : (
									<Eye className="h-4 w-4" />
								)}
								<span className="hidden lg:inline">Topics</span>
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
							{/* Header */}
							<div className="border-b border-[rgb(var(--border))] p-4">
								{/* md+: two halves (50/50). Right half is 5 columns. */}
								<div className="hidden md:grid md:grid-cols-2 md:items-center md:gap-6">
									<div className="grid grid-cols-[112px_1fr] items-center gap-4">
										<div className="muted text-xs font-medium">Difficulty</div>
										<div className="muted text-xs font-medium">Title</div>
									</div>

									<div className="grid grid-cols-5 items-center gap-3">
										<div className="muted text-xs font-medium">Acceptance</div>
										<div className="muted text-xs font-medium">Frequency</div>
										<div className="muted text-xs font-medium">Problem</div>
										<div className="muted text-xs font-medium">Video</div>
										<div className="muted text-xs font-medium text-right">
											Done
										</div>
									</div>
								</div>

								{/* mobile header */}
								<div className="grid grid-cols-1 gap-2 md:hidden">
									<div className="muted text-xs font-medium">Problems</div>
									<div className="muted text-xs">
										Acceptance • Frequency • Links • Done
									</div>
								</div>
							</div>

							<div className="divide-y divide-[rgb(var(--border))]">
								{shown.map((r) => {
									const prog = progressMap.get(r.link);
									const done = prog?.completed ?? false;

									return (
										<div key={r.link} className={`p-4 ${rowDoneClass(done)}`}>
											{/* md+: 2 columns (left 50%, right 50%) */}
											<div className="hidden md:grid md:grid-cols-2 md:items-start md:gap-6">
												{/* LEFT HALF: difficulty + title/topics */}
												<div className="grid grid-cols-[112px_1fr] items-start gap-4">
													<div className="pt-0.5">
														<span
															className={`chip px-3 py-1 text-xs font-semibold ${difficultyClass(
																r.difficulty,
															)}`}
														>
															{difficultyLabel(r.difficulty)}
														</span>
													</div>

													<div className="min-w-0">
														<div className="truncate font-medium">
															{r.title}
														</div>
														{showTopics ? (
															<div className="muted mt-1 whitespace-normal text-xs leading-5">
																{r.topics.length ? r.topics.join(", ") : "-"}
															</div>
														) : null}
													</div>
												</div>

												{/* RIGHT HALF: 5 items share this 50% */}
												<div className="grid grid-cols-5 items-center gap-3">
													<div className="muted text-sm">
														{formatAcceptance(r.acceptanceRate)}
													</div>

													<div className="muted text-sm">
														{formatFreq(r.frequency)}
													</div>

													<div>
														<a
															className="btn"
															href={r.link}
															target="_blank"
															rel="noreferrer"
															aria-label="Open problem"
														>
															<ExternalLink className="h-6 w-6" />
														</a>
													</div>

													<div>
														{r.videoUrl ? (
															<a
																className="btn"
																href={r.videoUrl}
																target="_blank"
																rel="noreferrer"
																aria-label="Open video"
															>
																<Video className="h-6 w-6" />
															</a>
														) : (
															<span className="muted text-sm">-</span>
														)}
													</div>

													<div className="flex items-center justify-end">
														<button
															type="button"
															className={`btn ${done ? "btn-primary" : ""}`}
															aria-pressed={done}
															aria-label={
																done ? "Mark unsolved" : "Mark solved"
															}
															onClick={() => {
																void toggleCompleted(r.link, r.difficulty);
															}}
														>
															{done ? "✓" : " "}
														</button>
													</div>
												</div>
											</div>

											{/* MOBILE: stacked but readable */}
											<div className="grid grid-cols-1 gap-3 md:hidden">
												<div className="flex items-start justify-between gap-3">
													<div className="min-w-0">
														<div className="flex items-center gap-2">
															<span
																className={`chip px-3 py-1 text-xs font-semibold ${difficultyClass(
																	r.difficulty,
																)}`}
															>
																{difficultyLabel(r.difficulty)}
															</span>
															<div className="truncate font-medium">
																{r.title}
															</div>
														</div>

														{showTopics ? (
															<div className="muted mt-1 whitespace-normal text-xs leading-5">
																{r.topics.length ? r.topics.join(", ") : "-"}
															</div>
														) : null}
													</div>

													<button
														type="button"
														className={`btn ${done ? "btn-primary" : ""}`}
														aria-pressed={done}
														aria-label={done ? "Mark unsolved" : "Mark solved"}
														onClick={() => {
															void toggleCompleted(r.link, r.difficulty);
														}}
													>
														{done ? "✓" : " "}
													</button>
												</div>

												<div className="grid grid-cols-2 gap-3">
													<div className="muted text-sm">
														<span className="muted text-xs">Acceptance</span>
														<div>{formatAcceptance(r.acceptanceRate)}</div>
													</div>
													<div className="muted text-sm">
														<span className="muted text-xs">Frequency</span>
														<div>{formatFreq(r.frequency)}</div>
													</div>
												</div>

												<div className="flex items-center gap-2">
													<a
														className="btn"
														href={r.link}
														target="_blank"
														rel="noreferrer"
														aria-label="Open problem"
													>
														<ExternalLink className="h-6 w-6" />
													</a>

													{r.videoUrl ? (
														<a
															className="btn"
															href={r.videoUrl}
															target="_blank"
															rel="noreferrer"
															aria-label="Open video"
														>
															<Video className="h-6 w-6" />
														</a>
													) : null}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						<div className="muted text-sm leading-6">
							Showing {shown.length} of {filtered.length} filtered rows.
							{filtered.length > 200 ? " (capped at 200 for now)" : ""}
							{state.issuesCount > 0
								? ` • ${state.issuesCount} invalid rows dropped`
								: ""}
							{videoIndexReady ? "" : " • videos not loaded"}
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
