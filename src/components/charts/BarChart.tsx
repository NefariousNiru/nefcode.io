// file: src/components/charts/BarChart.tsx

import { ChevronDown, ChevronUp } from "lucide-react";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";

export type BarDatum = {
	readonly label: string;
	readonly value: number;
	readonly sublabel?: string;
};

type Persisted = {
	readonly open: boolean;
	readonly limit: number;
};

function safeParse(raw: string | null): Persisted | null {
	if (!raw) return null;
	try {
		const v = JSON.parse(raw) as Partial<Persisted>;
		if (typeof v.open !== "boolean") return null;
		if (typeof v.limit !== "number" || !Number.isFinite(v.limit)) return null;
		return { open: v.open, limit: v.limit };
	} catch {
		return null;
	}
}

export function BarChart(props: {
	readonly chartId?: string; // <-- add this
	readonly title: string;
	readonly subtitle?: string;
	readonly data: readonly BarDatum[];
	/** If omitted, normalizes by max(value). */
	readonly normalizeTo?: number;
	readonly defaultOpen?: boolean;
	readonly initialCount?: number;
	readonly step?: number;
}): React.ReactElement {
	const {
		chartId,
		title,
		subtitle,
		data,
		normalizeTo,
		defaultOpen = false,
		initialCount = 10,
		step = 10,
	} = props;

	const storageKey = chartId ? `nefcode.barchart.${chartId}` : null;

	const initial = useMemo(() => {
		if (!storageKey) return null;
		return safeParse(localStorage.getItem(storageKey));
	}, [storageKey]);

	const [open, setOpen] = useState<boolean>(initial?.open ?? defaultOpen);
	const [limit, setLimit] = useState<number>(
		Math.max(1, initial?.limit ?? initialCount),
	);

	// Persist per chart so charts don't affect each other
	useEffect(() => {
		if (!storageKey) return;
		const v: Persisted = { open, limit };
		localStorage.setItem(storageKey, JSON.stringify(v));
	}, [storageKey, open, limit]);

	// If dataset shrinks (filters), keep limit sane
	useEffect(() => {
		if (!open) return;
		if (limit > data.length)
			setLimit(Math.max(1, Math.min(data.length, initialCount)));
	}, [data.length, open, limit, initialCount]);

	const max = useMemo(
		() => data.reduce((m, d) => Math.max(m, d.value), 0),
		[data],
	);
	const denom = normalizeTo && normalizeTo > 0 ? normalizeTo : max || 1;

	const visible = open ? data.slice(0, limit) : [];
	const hasMore = open && limit < data.length;

	return (
		<div className="card p-6 self-start h-fit">
			<button
				type="button"
				className="w-full text-left"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<div className="text-base font-semibold">{title}</div>
						{subtitle ? (
							<div className="muted mt-1 text-xs">{subtitle}</div>
						) : null}
					</div>

					<div className="flex items-center gap-2">
						<div className="chip px-3 py-1 text-xs">{data.length} items</div>
						<span className="btn btn-ghost px-3 py-1 text-xs">
							{open ? (
								<>
									Hide <ChevronUp className="h-4 w-4" />
								</>
							) : (
								<>
									Show <ChevronDown className="h-4 w-4" />
								</>
							)}
						</span>
					</div>
				</div>
			</button>

			{open ? (
				<>
					<div className="mt-4 space-y-2">
						{visible.map((d) => {
							const pct = Math.max(0, Math.min(1, d.value / denom));
							return (
								<div
									key={d.label}
									className="rounded-xl border border-[rgb(var(--border))] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<div className="min-w-0">
											<div className="truncate text-sm font-medium">
												{d.label}
											</div>
											{d.sublabel ? (
												<div className="muted mt-0.5 truncate text-xs">
													{d.sublabel}
												</div>
											) : null}
										</div>
										<div className="chip px-3 py-1 text-xs">
											<span className="font-semibold">
												{d.value.toFixed(0)}
											</span>
										</div>
									</div>

									<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(var(--fg),0.10)]">
										<div
											className="h-full rounded-full bg-[rgba(99,102,241,0.75)]"
											style={{ width: `${pct * 100}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-4 flex items-center justify-between gap-3">
						<div className="muted text-xs">
							Showing {Math.min(limit, data.length)} of {data.length}
						</div>

						<div className="flex items-center gap-2">
							{hasMore ? (
								<button
									type="button"
									className="btn"
									onClick={() =>
										setLimit((v) => Math.min(data.length, v + step))
									}
								>
									Load more
								</button>
							) : null}

							{data.length > initialCount ? (
								<button
									type="button"
									className="btn btn-ghost"
									onClick={() => setLimit(Math.max(1, initialCount))}
								>
									Reset
								</button>
							) : null}
						</div>
					</div>
				</>
			) : null}
		</div>
	);
}
