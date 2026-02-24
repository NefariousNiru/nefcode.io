// file: src/pages/CompaniesPage.tsx

import { Pin, PinOff, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../data/manifest";
import type { ManifestCompany } from "../domain/types";
import { useCompanyStatsLazy } from "../domain/useCompanyStatsLazy";
import { usePinnedCompanies } from "../storage/usePinnedCompanies.ts";
import { clampPins } from "../utils/functions.ts";

type LoadStateCompanies =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| {
			readonly kind: "ready";
			readonly companies: readonly ManifestCompany[];
			readonly generatedAt: string;
	  };

function diffChipClass(kind: "easy" | "medium" | "hard" | "total"): string {
	// Light and dark friendly tints, no Tailwind color tokens required.
	if (kind === "easy")
		return "bg-[rgba(34,197,94,0.14)] text-[rgba(34,197,94,0.95)]";
	if (kind === "medium")
		return "bg-[rgba(59,130,246,0.14)] text-[rgba(59,130,246,0.95)]";
	if (kind === "hard")
		return "bg-[rgba(244,63,94,0.14)] text-[rgba(244,63,94,0.95)]";
	return "bg-[rgba(99,102,241,0.14)] text-[rgba(99,102,241,0.95)]";
}

export function CompaniesPage() {
	const [state, setState] = useState<LoadStateCompanies>({ kind: "loading" });
	const [query, setQuery] = useState("");

	useEffect(() => {
		const ac = new AbortController();
		setState({ kind: "loading" });

		fetchManifest(ac.signal)
			.then((m) =>
				setState({
					kind: "ready",
					companies: m.companies,
					generatedAt: m.generatedAt || "unknown",
				}),
			)
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, []);

	const { pinned, pinnedSet, setPinned } = usePinnedCompanies();

	const companies = useMemo(() => {
		if (state.kind !== "ready") return [];
		const q = query.trim().toLowerCase();
		if (!q) return state.companies;
		return state.companies.filter((c) => c.name.toLowerCase().includes(q));
	}, [state, query]);

	// ---- visibility tracking (lazy stats) ----
	const [visibleNames, setVisibleNames] = useState<readonly string[]>([]);
	const visibleSetRef = useRef<Set<string>>(new Set());

	const observerRef = useRef<IntersectionObserver | null>(null);
	const nodeToNameRef = useRef<Map<Element, string>>(new Map());

	useEffect(() => {
		visibleSetRef.current = new Set();
		setVisibleNames([]);

		observerRef.current?.disconnect();
		nodeToNameRef.current.clear();

		observerRef.current = new IntersectionObserver(
			(entries) => {
				let changed = false;
				for (const e of entries) {
					const name = nodeToNameRef.current.get(e.target);
					if (!name) continue;

					if (e.isIntersecting) {
						if (!visibleSetRef.current.has(name)) {
							visibleSetRef.current.add(name);
							changed = true;
						}
					}
				}
				if (changed) setVisibleNames(Array.from(visibleSetRef.current));
			},
			{
				root: null,
				rootMargin: "650px 0px",
				threshold: 0.01,
			},
		);

		return () => {
			observerRef.current?.disconnect();
			observerRef.current = null;
			nodeToNameRef.current.clear();
		};
	}, []);

	const registerCardRef = (name: string) => (node: HTMLDivElement | null) => {
		if (!node) return;
		const obs = observerRef.current;
		if (!obs) return;
		nodeToNameRef.current.set(node, name);
		obs.observe(node);
	};

	const manifestAt = state.kind === "ready" ? state.generatedAt : "";
	const { statsByCompany } = useCompanyStatsLazy({
		manifestAt,
		companies: state.kind === "ready" ? state.companies : [],
		visibleCompanyNames: visibleNames,
	});

	const togglePin = (company: string) => {
		const pinnedArr = [...pinned];
		const isPinned = pinnedSet.has(company);

		const next = isPinned
			? pinnedArr.filter((x) => x !== company)
			: clampPins([company, ...pinnedArr]);

		setPinned(next);
	};

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
						<p className="muted mt-1">
							Browse companies and stats. Pin up to 5 for quick access.
						</p>
					</div>

					<div className="relative w-full max-w-xl">
						<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
						<input
							className="input pl-11"
							placeholder="Search companies..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
						/>
					</div>
				</div>

				{state.kind === "loading" ? (
					<div className="glass p-6">
						<div className="text-base font-semibold">Loading manifest...</div>
						<div className="muted mt-2 text-sm">
							Fetching {import.meta.env.BASE_URL}manifest.json
						</div>
					</div>
				) : null}

				{state.kind === "error" ? (
					<div className="glass p-6">
						<div className="text-base font-semibold">
							Failed to load manifest
						</div>
						<div className="muted mt-2 text-sm">{state.message}</div>
					</div>
				) : null}

				{state.kind === "ready" ? (
					<>
						<div className="grid lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-3">
							{companies.map((c) => {
								const pinned = pinnedSet.has(c.name);
								const pinDisabled = !pinned && pinnedSet.size >= 5;

								const st = statsByCompany.get(c.name);

								const to = `/companies/${encodeURIComponent(c.name)}`;

								return (
									<div key={c.name} ref={registerCardRef(c.name)}>
										<Link
											to={to}
											className="company-tile group block"
											aria-label={`Open ${c.name}`}
										>
											{/* Row 1: name + pin */}
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<div className="truncate text-base font-semibold text-[rgb(var(--fg))]">
														{c.name}
													</div>
												</div>

												<button
													type="button"
													className={`btn btn-ghost ${pinDisabled ? "opacity-50" : ""}`}
													onClick={(e) => {
														// prevent navigating the Link wrapper
														e.preventDefault();
														e.stopPropagation();
														if (pinDisabled) return;
														togglePin(c.name);
													}}
													aria-label={pinned ? "Unpin company" : "Pin company"}
													title={pinDisabled ? "Pin limit reached (5)" : ""}
												>
													{pinned ? (
														<>
															<PinOff className="h-4 w-4" />
															<span className="hidden sm:inline">Unpin</span>
														</>
													) : (
														<>
															<Pin className="h-4 w-4" />
															<span className="hidden sm:inline">Pin</span>
														</>
													)}
												</button>
											</div>

											{/* Row 2: difficulty chips (single line, wrap on tiny screens) */}
											<div className="mt-3 flex flex-wrap items-center gap-2">
												<span
													className={`chip px-3 py-1 text-xs ${diffChipClass("easy")}`}
												>
													Easy{" "}
													<span className="font-semibold">
														{st ? `${st.easy.solved}/${st.easy.total}` : "…"}
													</span>
												</span>

												<span
													className={`chip px-3 py-1 text-xs ${diffChipClass("medium")}`}
												>
													Medium{" "}
													<span className="font-semibold">
														{st
															? `${st.medium.solved}/${st.medium.total}`
															: "…"}
													</span>
												</span>

												<span
													className={`chip px-3 py-1 text-xs ${diffChipClass("hard")}`}
												>
													Hard{" "}
													<span className="font-semibold">
														{st ? `${st.hard.solved}/${st.hard.total}` : "…"}
													</span>
												</span>

												<span
													className={`chip px-3 py-1 text-xs ${diffChipClass("total")}`}
												>
													Total{" "}
													<span className="font-semibold">
														{st ? `${st.total.solved}/${st.total.total}` : "…"}
													</span>
												</span>
											</div>
										</Link>
									</div>
								);
							})}
						</div>

						<div className="muted text-sm leading-6">
							Loaded {state.companies.length} companies.
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
