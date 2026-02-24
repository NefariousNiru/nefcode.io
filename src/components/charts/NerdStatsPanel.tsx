// file: src/components/charts/NerdStatsPanel.tsx

import type * as React from "react";
import type { Difficulty } from "../../domain/types";
import type { SummaryStats } from "../../stats/statsMath";
import { summarize } from "../../stats/statsMath";
import { prettyProblemLabel } from "../../utils/functions.ts";
import {
	computeStreaks,
	dayKeyLocal,
	weekKeyLocal,
} from "../../utils/timeUtils";

export type ProgressRow = {
	readonly link: string;
	readonly completed: boolean;
	readonly minutes: number | null;
	readonly updatedAt: number;
	readonly difficulty: Difficulty;
};

export function NerdStatsPanel(props: {
	readonly progressRows: readonly ProgressRow[];
	readonly progressMinutes: ReadonlyMap<Difficulty, readonly number[]>;
}): React.ReactElement {
	const { progressRows, progressMinutes } = props;

	const solved = progressRows.filter((r) => r.completed);

	const dayKeys = solved.map((r) => dayKeyLocal(r.updatedAt));
	const streaks = computeStreaks(dayKeys);

	// Weekly buckets (last 10)
	const byWeek = new Map<
		string,
		{ EASY: number; MEDIUM: number; HARD: number }
	>();
	for (const r of solved) {
		const wk = weekKeyLocal(r.updatedAt);
		const cur = byWeek.get(wk) ?? { EASY: 0, MEDIUM: 0, HARD: 0 };
		cur[r.difficulty] += 1;
		byWeek.set(wk, cur);
	}

	const weeks = [...byWeek.keys()].sort().slice(-10);
	const weekSeries = weeks.map((wk) => ({
		wk,
		...(byWeek.get(wk) ?? { EASY: 0, MEDIUM: 0, HARD: 0 }),
	}));

	const maxWeek = weekSeries.reduce(
		(m, w) => Math.max(m, w.EASY + w.MEDIUM + w.HARD),
		0,
	);

	// Efficiency summaries
	const easyStats = summarize(progressMinutes.get("EASY") ?? []);
	const medStats = summarize(progressMinutes.get("MEDIUM") ?? []);
	const hardStats = summarize(progressMinutes.get("HARD") ?? []);

	// Outliers
	const outliers = solved
		.filter((r) => r.minutes !== null && Number.isFinite(r.minutes))
		.map((r) => ({ link: r.link, minutes: r.minutes ?? 0, d: r.difficulty }))
		.sort((a, b) => b.minutes - a.minutes)
		.slice(0, 8);

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<StreaksCard
				current={streaks.current}
				longest={streaks.longest}
				activeDays30={streaks.activeDays30}
			/>

			<DifficultyBreakdownCard
				weeks={weeks}
				series={weekSeries}
				maxWeek={maxWeek}
			/>

			<EfficiencyCard easy={easyStats} medium={medStats} hard={hardStats} />

			<OutlierCard outliers={outliers} />
		</div>
	);
}

function StreaksCard(props: {
	readonly current: number;
	readonly longest: number;
	readonly activeDays30: number;
}): React.ReactElement {
	const { current, longest, activeDays30 } = props;

	return (
		<div className="card p-6">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-base font-semibold">Streaks</div>
					<div className="muted mt-1 text-xs">
						Days you marked at least one problem complete
					</div>
				</div>
			</div>

			<div className="mt-4 grid grid-cols-3 gap-2 text-xs">
				<MetricBox label="Current" value={current} suffix="days" />
				<MetricBox label="Longest" value={longest} suffix="days" />
				<MetricBox label="Active" value={activeDays30} suffix="/30 days" />
			</div>

			<div className="mt-4 muted text-xs leading-5">
				If you toggle completion on old problems, streaks reflect that.
			</div>
		</div>
	);
}

function MetricBox(props: {
	readonly label: string;
	readonly value: number;
	readonly suffix: string;
}): React.ReactElement {
	const { label, value, suffix } = props;

	return (
		<div className="rounded-2xl border border-[rgb(var(--border))] p-3">
			<div className="muted">{label}</div>
			<div className="mt-1 text-lg font-semibold">{value}</div>
			<div className="muted text-[11px]">{suffix}</div>
		</div>
	);
}

function DifficultyBreakdownCard(props: {
	readonly weeks: readonly string[];
	readonly series: readonly {
		wk: string;
		EASY: number;
		MEDIUM: number;
		HARD: number;
	}[];
	readonly maxWeek: number;
}): React.ReactElement {
	const { weeks, series, maxWeek } = props;

	return (
		<div className="card p-6">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-base font-semibold">Difficulty Breakdown</div>
					<div className="muted mt-1 text-xs">
						Solved per week (last 10 weeks)
					</div>
				</div>
				<div className="chip px-3 py-1 text-xs">{weeks.length}w</div>
			</div>

			<div className="mt-4 space-y-2">
				{series.map((w) => {
					const total = w.EASY + w.MEDIUM + w.HARD;
					const denom = maxWeek || 1;
					const pct = (total / denom) * 100;

					const easyPct = total > 0 ? (w.EASY / total) * 100 : 0;
					const medPct = total > 0 ? (w.MEDIUM / total) * 100 : 0;
					const hardPct = total > 0 ? (w.HARD / total) * 100 : 0;

					return (
						<div
							key={w.wk}
							className="rounded-xl border border-[rgb(var(--border))] p-3"
						>
							<div className="flex items-center justify-between text-xs">
								<div className="muted">{w.wk}</div>
								<div className="chip px-3 py-1 text-xs">
									<span className="font-semibold">{total}</span>
								</div>
							</div>

							<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(var(--fg),0.10)]">
								<div style={{ width: `${pct}%` }} className="h-full">
									<div className="flex h-full w-full">
										{/* Easy - green */}
										<div
											style={{ width: `${easyPct}%` }}
											className="h-full bg-[rgba(34,197,94,0.80)]"
										/>
										{/* Medium - orange (LC-ish) */}
										<div
											style={{ width: `${medPct}%` }}
											className="h-full bg-[rgba(245,158,11,0.85)]"
										/>
										{/* Hard - red */}
										<div
											style={{ width: `${hardPct}%` }}
											className="h-full bg-[rgba(244,63,94,0.80)]"
										/>
									</div>
								</div>
							</div>

							<div className="mt-2 flex gap-2 text-[11px]">
								<span className="chip px-2 py-1">Easy {w.EASY}</span>
								<span className="chip px-2 py-1">Medium {w.MEDIUM}</span>
								<span className="chip px-2 py-1">Hard {w.HARD}</span>
							</div>
						</div>
					);
				})}

				{weeks.length === 0 ? (
					<div className="muted text-sm">No solved events yet.</div>
				) : null}
			</div>
		</div>
	);
}

const effRowClass: Record<"Easy" | "Medium" | "Hard", string> = {
	Easy: "eff-row eff-easy",
	Medium: "eff-row eff-medium",
	Hard: "eff-row eff-hard",
};

function EfficiencyCard(props: {
	readonly easy: SummaryStats;
	readonly medium: SummaryStats;
	readonly hard: SummaryStats;
}): React.ReactElement {
	const { easy, medium, hard } = props;

	return (
		<div className="card p-6">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-base font-semibold">Efficiency</div>
					<div className="muted mt-1 text-xs">Minutes per solved problem</div>
				</div>
			</div>

			<div className="mt-4 grid gap-2">
				<EffRow label="Easy" stats={easy} />
				<EffRow label="Medium" stats={medium} />
				<EffRow label="Hard" stats={hard} />
			</div>

			<div className="mt-4 muted text-xs leading-5">
				Only uses problems where you filled in minutes.
			</div>
		</div>
	);
}

function EffRow(props: {
	readonly label: "Easy" | "Medium" | "Hard";
	readonly stats: SummaryStats;
}): React.ReactElement {
	const { label, stats } = props;

	return (
		<div className={effRowClass[label]}>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<span className="eff-chip">{label.toUpperCase()}</span>

					<div className="eff-meta">
						Count: <span className="eff-meta-strong">{stats.n}</span>
					</div>
				</div>

				<div className="eff-p95">
					P95{" "}
					<span className="eff-p95-strong">
						{stats.p95 === null ? "—" : `${Math.round(stats.p95)}m`}
					</span>
				</div>
			</div>

			<div className="mt-3 grid grid-cols-4 gap-2">
				<StatBox label="Avg" value={stats.avg} />
				<StatBox label="P50" value={stats.p50} />
				<StatBox
					label="Min"
					value={stats.min !== null ? `${Math.round(stats.min)}m` : null}
				/>
				<StatBox
					label="Max"
					value={stats.max !== null ? `${Math.round(stats.max)}m` : null}
				/>
			</div>
		</div>
	);
}

function StatBox({
	label,
	value,
}: {
	label: string;
	value: number | string | null;
}) {
	return (
		<div className="eff-stat">
			<div className="eff-stat-label">{label}</div>
			<div className="eff-stat-value">
				{value === null
					? "—"
					: typeof value === "number"
						? `${Math.round(value)}m`
						: value}
			</div>
		</div>
	);
}

function OutlierCard(props: {
	readonly outliers: readonly {
		link: string;
		minutes: number;
		d: Difficulty;
	}[];
}): React.ReactElement {
	const diffLabel = (d: Difficulty): string =>
		d === "EASY" ? "Easy" : d === "MEDIUM" ? "Medium" : "Hard";

	const worst10 = [...props.outliers]
		.filter((o) => Number.isFinite(o.minutes))
		.sort((a, b) => b.minutes - a.minutes)
		.slice(0, 10);

	return (
		<div className="card p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-base font-semibold">Time Sinks</div>
					<div className="muted mt-1 text-xs">Worst 10 by recorded minutes</div>
				</div>

				<div className="chip px-3 py-1 text-xs">Top {worst10.length}</div>
			</div>

			<div className="mt-4 space-y-2">
				{worst10.map((o) => (
					<div
						key={o.link}
						className="rounded-xl border border-[rgb(var(--border))] p-3"
					>
						<div className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<a
									href={o.link}
									target="_blank"
									rel="noreferrer"
									className="truncate text-sm font-medium underline decoration-[rgba(var(--fg),0.25)] underline-offset-4 hover:decoration-[rgba(var(--fg),0.55)]"
									title={o.link}
								>
									{prettyProblemLabel(o.link)}
								</a>
								<div className="muted mt-0.5 text-xs">{diffLabel(o.d)}</div>
							</div>

							<div className="chip px-3 py-1 text-xs">
								<span className="font-semibold">{Math.round(o.minutes)}m</span>
							</div>
						</div>
					</div>
				))}

				{worst10.length === 0 ? (
					<div className="muted text-sm">No timed solves yet.</div>
				) : null}
			</div>
		</div>
	);
}
