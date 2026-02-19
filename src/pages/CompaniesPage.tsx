// file: src/pages/CompaniesPage.tsx

import { Pin, PinOff, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../data/manifest";
import type { ManifestCompany } from "../domain/types";
import { readPrefs, writePinnedCompanies } from "../storage/prefs";
import { clampPins } from "../utils/functions.ts";

type LoadStateCompanies =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| { readonly kind: "ready"; readonly companies: readonly ManifestCompany[] };

/**
 * Companies browser page.
 * - Loads manifest from GitHub Pages using Vite BASE_URL.
 * - Supports pinning up to 5 companies (localStorage).
 */
export function CompaniesPage() {
	const [state, setState] = useState<LoadStateCompanies>({ kind: "loading" });
	const [query, setQuery] = useState("");

	useEffect(() => {
		const ac = new AbortController();
		setState({ kind: "loading" });

		fetchManifest(ac.signal)
			.then((m) => setState({ kind: "ready", companies: m.companies }))
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, []);

	const prefs = readPrefs();
	const pinnedSet = useMemo(
		() => new Set(prefs.pinnedCompanies),
		[prefs.pinnedCompanies],
	);

	const companies = useMemo(() => {
		if (state.kind !== "ready") return [];
		const q = query.trim().toLowerCase();
		if (!q) return state.companies;
		return state.companies.filter((c) => c.name.toLowerCase().includes(q));
	}, [state, query]);

	const togglePin = (company: string) => {
		const pinned = Array.from(pinnedSet);
		const isPinned = pinnedSet.has(company);

		const next = isPinned
			? pinned.filter((x) => x !== company)
			: clampPins([company, ...pinned]);

		writePinnedCompanies(next);
		window.location.reload();
	};

	return (
		<div className="container-x py-10">
			<div className="flex flex-col gap-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight">Companies</h1>
						<p className="muted mt-1">
							Browse lists. Pin up to 5 for quick access.
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
						<div className="grid grid-auto-fit gap-4">
							{companies.map((c) => {
								const pinned = pinnedSet.has(c.name);
								const pinDisabled = !pinned && pinnedSet.size >= 5;

								return (
									<div key={c.name} className="card p-6">
										<div className="flex items-start justify-between gap-4">
											<div className="min-w-0">
												<div className="text-lg font-semibold">{c.name}</div>
												<div className="muted mt-1 text-sm">
													{c.files.length} lists
												</div>
											</div>

											<button
												type="button"
												className={`btn ${pinDisabled ? "opacity-50" : ""}`}
												onClick={() => {
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

										<div className="mt-5 flex gap-3">
											<Link
												to={`/companies/${encodeURIComponent(c.name)}`}
												className="btn btn-primary"
											>
												Open lists
											</Link>
											<Link
												to={`/companies/${encodeURIComponent(c.name)}`}
												className="btn"
											>
												Preview UI
											</Link>
										</div>
									</div>
								);
							})}
						</div>

						<div className="muted text-sm leading-6">
							Loaded {state.companies.length} companies from manifest.json.
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
