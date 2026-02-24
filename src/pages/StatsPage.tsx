// file: src/pages/StatsPage.tsx

import { useEffect, useMemo, useState } from "react";
import { BarChart } from "../components/charts/BarChart";
import { NerdStatsPanel } from "../components/charts/NerdStatsPanel";
import { StatGrid } from "../components/charts/StatGrid";
import { fetchManifest } from "../data/manifest";
import type { Difficulty, ManifestCompany } from "../domain/types";
import { getCompanyStats } from "../stats/companyStats";
import { summarize } from "../stats/statsMath";
import { db } from "../storage/db";
import { withConcurrency } from "../utils/functions";

type LoadState =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| {
			readonly kind: "ready";
			readonly manifestAt: string;
			readonly companies: readonly ManifestCompany[];
	  };

type CompanyScore = {
	readonly company: string;
	readonly solved: number;
	readonly total: number;
	readonly pct: number;
};

function pct(n: number, d: number): number {
	if (d <= 0) return 0;
	return Math.round((n / d) * 100);
}

export function StatsPage() {
	const [state, setState] = useState<LoadState>({ kind: "loading" });

	const [progressRows, setProgressRows] = useState<
		readonly {
			link: string;
			completed: boolean;
			minutes: number | null;
			updatedAt: number;
			difficulty: Difficulty;
		}[]
	>(() => []);

	const [topCompanies, setTopCompanies] = useState<readonly CompanyScore[]>([]);
	const [readyCompanies, setReadyCompanies] = useState<readonly CompanyScore[]>(
		[],
	);

	useEffect(() => {
		const ac = new AbortController();
		setState({ kind: "loading" });

		fetchManifest(ac.signal)
			.then((m) => {
				if (ac.signal.aborted) return;
				setState({
					kind: "ready",
					manifestAt: m.generatedAt || "dev",
					companies: m.companies,
				});
			})
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, []);

	useEffect(() => {
		let cancelled = false;

		db.progress
			.toArray()
			.then((rows) => {
				if (cancelled) return;
				setProgressRows(rows);
			})
			.catch(() => {
				if (cancelled) return;
				setProgressRows([]);
			});

		return () => {
			cancelled = true;
		};
	}, []);

	const progressMinutes = useMemo(() => {
		const by: Record<Difficulty, number[]> = { EASY: [], MEDIUM: [], HARD: [] };
		for (const r of progressRows) {
			if (!r.completed) continue;
			if (r.minutes === null) continue;
			by[r.difficulty].push(r.minutes);
		}
		return new Map<Difficulty, readonly number[]>([
			["EASY", by.EASY],
			["MEDIUM", by.MEDIUM],
			["HARD", by.HARD],
		]);
	}, [progressRows]);

	useEffect(() => {
		if (state.kind !== "ready") return;

		const ac = new AbortController();
		setTopCompanies([]);
		setReadyCompanies([]);

		const run = async () => {
			const scores: CompanyScore[] = [];

			await withConcurrency(state.companies, 3, async (c) => {
				if (ac.signal.aborted) return;
				try {
					const st = await getCompanyStats({
						manifestAt: state.manifestAt,
						company: c,
						signal: ac.signal,
					});

					const solved = st.total.solved;
					const total = st.total.total;
					if (total <= 0) return;

					scores.push({
						company: c.name,
						solved,
						total,
						pct: pct(solved, total),
					});
				} catch {
					// ignore per-company failures
				}
			});

			if (ac.signal.aborted) return;

			scores.sort((a, b) => b.solved - a.solved);

			setTopCompanies(scores.slice(0, 12));
			setReadyCompanies(
				scores
					.filter((s) => s.total >= 30 && s.pct >= 60)
					.sort((a, b) => b.pct - a.pct || b.solved - a.solved)
					.slice(0, 10),
			);
		};

		void run();
		return () => ac.abort();
	}, [state]);

	const statsByDifficulty = useMemo(() => {
		const m = new Map<string, ReturnType<typeof summarize>>();
		m.set("EASY", summarize(progressMinutes.get("EASY") ?? []));
		m.set("MEDIUM", summarize(progressMinutes.get("MEDIUM") ?? []));
		m.set("HARD", summarize(progressMinutes.get("HARD") ?? []));
		return m;
	}, [progressMinutes]);

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight">Stats</h1>
					<p className="muted mt-1">
						Your local progress - breakdowns, percentiles, and company
						readiness.
					</p>
				</div>

				{state.kind === "loading" ? (
					<div className="glass p-6">
						<div className="text-base font-semibold">Loading stats…</div>
						<div className="muted mt-2 text-sm">
							Reading manifest + local progress
						</div>
					</div>
				) : null}

				{state.kind === "error" ? (
					<div className="glass p-6">
						<div className="text-base font-semibold">Failed to load</div>
						<div className="muted mt-2 text-sm">{state.message}</div>
					</div>
				) : null}

				{state.kind === "ready" ? (
					<>
						<StatGrid
							title="Time spent percentiles"
							subtitle="Minutes per solved problem (based on what you recorded)"
							statsByKey={statsByDifficulty}
						/>

						<div className="grid gap-4 md:grid-cols-2 items-start">
							<BarChart
								chartId="top-companies"
								title="Top companies by solved"
								subtitle="Companies where you solved the most problems"
								data={topCompanies.map((s) => ({
									label: s.company,
									value: s.solved,
									sublabel: `${s.solved}/${s.total} (${s.pct}%)`,
								}))}
							/>

							<BarChart
								chartId="interview-ready"
								title="Interview-ready companies"
								subtitle="Heuristic: >= 30 problems in company and >= 60% solved"
								data={readyCompanies.map((s) => ({
									label: s.company,
									value: s.pct,
									sublabel: `${s.solved}/${s.total}`,
								}))}
								normalizeTo={100}
							/>
						</div>

						<NerdStatsPanel
							progressRows={progressRows}
							progressMinutes={progressMinutes}
						/>
					</>
				) : null}
			</div>
		</div>
	);
}
