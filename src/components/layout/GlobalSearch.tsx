// file: src/components/layout/GlobalSearch.tsx

import { Search, X } from "lucide-react";
import type * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGlobalSearch } from "../../hooks/useGlobalSearch";

function diffChip(d: "EASY" | "MEDIUM" | "HARD"): string {
	if (d === "EASY")
		return "bg-[rgba(34,197,94,0.14)] text-[rgba(34,197,94,0.95)]";
	if (d === "MEDIUM")
		return "bg-[rgba(245,158,11,0.14)] text-[rgba(245,158,11,0.95)]";
	return "bg-[rgba(244,63,94,0.14)] text-[rgba(244,63,94,0.95)]";
}

export function GlobalSearch(props: {
	readonly className?: string;
	readonly placeholder?: string;
}): React.ReactElement {
	const { className, placeholder } = props;

	const nav = useNavigate();
	const { query, setQuery, open, setOpen, loading, results, clear } =
		useGlobalSearch();

	const rootRef = useRef<HTMLDivElement | null>(null);

	// Close on outside click
	useEffect(() => {
		if (!open) return;

		const onDown = (e: MouseEvent) => {
			const root = rootRef.current;
			if (!root) return;
			if (e.target instanceof Node && !root.contains(e.target)) setOpen(false);
		};

		window.addEventListener("mousedown", onDown);
		return () => window.removeEventListener("mousedown", onDown);
	}, [open, setOpen]);

	// Esc closes
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, setOpen]);

	const grouped = useMemo(() => {
		const companies = results.filter((r) => r.kind === "company");
		const lists = results.filter((r) => r.kind === "list");
		const problems = results.filter((r) => r.kind === "problem");
		return { companies, lists, problems };
	}, [results]);

	return (
		<div ref={rootRef} className={className ?? ""}>
			<div className="relative w-full">
				<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
				<input
					className="input pl-11 pr-10"
					placeholder={placeholder ?? "Search companies, lists, problems..."}
					value={query}
					onFocus={() => setOpen(true)}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
				/>
				{query.trim().length > 0 ? (
					<button
						type="button"
						className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-ghost px-3 py-2"
						onClick={() => {
							clear();
							setOpen(true);
						}}
						aria-label="Clear search"
					>
						<X className="h-4 w-4" />
					</button>
				) : null}
			</div>

			{open ? (
				<div className="absolute mt-2 w-full">
					<div className="card p-3">
						{loading ? (
							<div className="muted px-2 py-2 text-sm">Searching…</div>
						) : null}

						{!loading && results.length === 0 && query.trim().length > 0 ? (
							<div className="muted px-2 py-2 text-sm">No matches.</div>
						) : null}

						{query.trim().length === 0 ? (
							<div className="muted px-2 py-2 text-sm">Type to search.</div>
						) : null}

						{grouped.companies.length > 0 ? (
							<div className="mt-2">
								<div className="muted px-2 text-xs">Companies</div>
								<div className="mt-2 space-y-1">
									{grouped.companies.map((r) => {
										if (r.kind !== "company") return null;
										return (
											<button
												key={r.key}
												type="button"
												className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-left hover:bg-[rgba(var(--fg),0.03)]"
												onClick={() => {
													setOpen(false);
													nav(r.to);
												}}
											>
												<div className="truncate text-sm font-medium">
													{r.company}
												</div>
											</button>
										);
									})}
								</div>
							</div>
						) : null}

						{grouped.lists.length > 0 ? (
							<div className="mt-3">
								<div className="muted px-2 text-xs">Lists</div>
								<div className="mt-2 space-y-1">
									{grouped.lists.map((r) => {
										if (r.kind !== "list") return null;
										return (
											<button
												key={r.key}
												type="button"
												className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-left hover:bg-[rgba(var(--fg),0.03)]"
												onClick={() => {
													setOpen(false);
													nav(r.to);
												}}
											>
												<div className="truncate text-sm font-medium">
													{r.company}
												</div>
												<div className="muted truncate text-xs">
													{r.listLabel}
												</div>
											</button>
										);
									})}
								</div>
							</div>
						) : null}

						{grouped.problems.length > 0 ? (
							<div className="mt-3">
								<div className="muted px-2 text-xs">
									Problems (opens link)
								</div>
								<div className="mt-2 space-y-1">
									{grouped.problems.map((r) => {
										if (r.kind !== "problem") return null;
										return (
											<a
												key={r.key}
												href={r.link}
												target="_blank"
												rel="noreferrer"
												className="block rounded-xl border border-[rgb(var(--border))] px-3 py-2 hover:bg-[rgba(var(--fg),0.03)]"
												onClick={() => setOpen(false)}
											>
												<div className="flex items-center justify-between gap-2">
													<div className="min-w-0">
														<div className="truncate text-sm font-medium">
															{r.title}
														</div>
														<div className="muted truncate text-xs">
															{r.completed ? "Solved" : "In progress"}
														</div>
													</div>
													<span
														className={`chip px-3 py-1 text-xs ${diffChip(r.difficulty)}`}
													>
														{r.difficulty === "EASY"
															? "Easy"
															: r.difficulty === "MEDIUM"
																? "Medium"
																: "Hard"}
													</span>
												</div>
											</a>
										);
									})}
								</div>
							</div>
						) : null}

						<div className="mt-3 flex items-center justify-between px-2">
							<div className="muted text-[11px]">Esc to close</div>
							<Link
								to="/companies"
								className="muted text-[11px] underline underline-offset-4"
								onClick={() => setOpen(false)}
							>
								Browse all companies
							</Link>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}
