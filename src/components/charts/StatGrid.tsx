// file: src/components/charts/StatGrid.tsx

import type * as React from "react";
import type { SummaryStats } from "../../stats/statsMath";

function fmt(n: number | null, suffix = ""): string {
	if (n === null) return "N/A";
	if (!Number.isFinite(n)) return "N/A";
	return `${Math.round(n)}${suffix}`;
}

function clamp01(x: number): number {
	if (x < 0) return 0;
	if (x > 1) return 1;
	return x;
}

function pos(value: number | null, min: number, max: number): number {
	if (value === null) return 0;
	if (!Number.isFinite(value)) return 0;
	if (max <= min) return 0;
	return clamp01((value - min) / (max - min));
}

function DifficultyCard(props: {
	readonly label: "Easy" | "Medium" | "Hard";
	readonly stats: SummaryStats;
}): React.ReactElement {
	const { label, stats } = props;

	const min = stats.min ?? 0;
	const max = stats.max ?? 0;

	const p50x = pos(stats.p50, min, max);
	const p95x = pos(stats.p95, min, max);
	const p99x = pos(stats.p99, min, max);

	const safeRange =
		stats.min !== null && stats.max !== null ? Math.max(0, max - min) : null;

	const tint =
		label === "Easy"
			? "bg-[rgba(34,197,94,0.14)] border-[rgba(34,197,94,0.22)]"
			: label === "Medium"
				? "bg-[rgba(59,130,246,0.14)] border-[rgba(59,130,246,0.22)]"
				: "bg-[rgba(244,63,94,0.14)] border-[rgba(244,63,94,0.22)]";

	return (
		<div className="rounded-2xl border border-[rgb(var(--border))] p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<span className={`chip px-3 py-1 text-xs border ${tint}`}>
							{label}
						</span>
						<div className="muted text-xs">
							Count:{" "}
							<span className="font-semibold text-[rgb(var(--fg))]">
								{stats.n}
							</span>
						</div>
					</div>
					<div className="mt-2 text-sm font-semibold">
						Time Distribution (mins)
					</div>
				</div>

				<div className="chip px-3 py-1 text-xs">
					P50 <span className="font-semibold">{fmt(stats.p50, "m")}</span>
				</div>
			</div>

			<div className="mt-4">
				<div className="flex items-center justify-between text-[11px] muted">
					<span>Min {fmt(stats.min, "m")}</span>
					<span>Max {fmt(stats.max, "m")}</span>
				</div>

				<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(var(--fg),0.10)]">
					<div
						className="h-full rounded-full bg-[rgba(99,102,241,0.55)]"
						style={{ width: `${p50x * 100}%` }}
					/>
				</div>

				<div className="relative mt-2 h-5 w-full">
					<div
						className="absolute top-0 h-5"
						style={{ left: `${p50x * 100}%` }}
					>
						<div className="h-5 w-[2px] bg-[rgba(99,102,241,0.85)]" />
					</div>

					<div
						className="absolute top-0 h-5"
						style={{ left: `${p95x * 100}%` }}
					>
						<div className="h-5 w-[2px] bg-[rgba(245,158,11,0.95)]" />
					</div>

					<div
						className="absolute top-0 h-5"
						style={{ left: `${p99x * 100}%` }}
					>
						<div className="h-5 w-[2px] bg-[rgba(244,63,94,0.95)]" />
					</div>
				</div>

				<div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
					<div className="chip px-3 py-1">
						P95 <span className="font-semibold">{fmt(stats.p95, "m")}</span>
					</div>
					<div className="chip px-3 py-1">
						P99 <span className="font-semibold">{fmt(stats.p99, "m")}</span>
					</div>
					<div className="chip px-3 py-1">
						Avg <span className="font-semibold">{fmt(stats.avg, "m")}</span>
					</div>
				</div>

				<div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
					<div className="chip px-3 py-1">
						Mode <span className="font-semibold">{fmt(stats.mode, "m")}</span>
					</div>
					<div className="chip px-3 py-1">
						Range{" "}
						<span className="font-semibold">
							{safeRange === null ? "N/A" : `${Math.round(safeRange)}m`}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

export function StatGrid(props: {
	readonly title: string;
	readonly subtitle?: string;
	readonly statsByKey: ReadonlyMap<string, SummaryStats>;
}): React.ReactElement {
	const { title, subtitle, statsByKey } = props;

	const easy = statsByKey.get("EASY") ?? null;
	const medium = statsByKey.get("MEDIUM") ?? null;
	const hard = statsByKey.get("HARD") ?? null;

	return (
		<div className="card p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-base font-semibold">{title}</div>
					{subtitle ? (
						<div className="muted mt-1 text-xs">{subtitle}</div>
					) : null}
				</div>
				<div className="chip px-3 py-1 text-xs">{statsByKey.size} groups</div>
			</div>

			<div className="mt-4 grid gap-3 lg:grid-cols-3 sm:grid-cols-2">
				<DifficultyCard
					label="Easy"
					stats={
						easy ?? {
							n: 0,
							min: null,
							max: null,
							avg: null,
							p50: null,
							p95: null,
							p99: null,
							mode: null,
						}
					}
				/>
				<DifficultyCard
					label="Medium"
					stats={
						medium ?? {
							n: 0,
							min: null,
							max: null,
							avg: null,
							p50: null,
							p95: null,
							p99: null,
							mode: null,
						}
					}
				/>
				<DifficultyCard
					label="Hard"
					stats={
						hard ?? {
							n: 0,
							min: null,
							max: null,
							avg: null,
							p50: null,
							p95: null,
							p99: null,
							mode: null,
						}
					}
				/>
			</div>
		</div>
	);
}
