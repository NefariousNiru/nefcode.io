// file: src/pages/CompanyFilesPage.tsx

import { ArrowRight, FileText, Pin, PinOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { fetchManifest } from "../data/manifest";
import { formatListLabel } from "../domain/normalize";
import type { ManifestCompany, ManifestFile } from "../domain/types";
import { readPrefs, writePinnedCompanies } from "../storage/prefs";
import { clampPins } from "../utils/functions.ts";

type LoadStateCompany =
	| { readonly kind: "loading" }
	| { readonly kind: "error"; readonly message: string }
	| { readonly kind: "ready"; readonly company: ManifestCompany };

export function CompanyFilesPage() {
	const { company: companyParam } = useParams();
	const companyName = companyParam ? decodeURIComponent(companyParam) : "";

	const [state, setState] = useState<LoadStateCompany>({ kind: "loading" });
	const [sp] = useSearchParams();
	const filter = (sp.get("q") ?? "").trim().toLowerCase();

	useEffect(() => {
		if (!companyName) {
			setState({ kind: "error", message: "Missing company in route." });
			return;
		}

		const ac = new AbortController();
		setState({ kind: "loading" });

		fetchManifest(ac.signal)
			.then((m) => {
				const found = m.companies.find((c) => c.name === companyName);
				if (!found) {
					setState({
						kind: "error",
						message: `Company not found in manifest: ${companyName}`,
					});
					return;
				}
				setState({ kind: "ready", company: found });
			})
			.catch((e: unknown) => {
				if (ac.signal.aborted) return;
				const msg = e instanceof Error ? e.message : "Unknown error";
				setState({ kind: "error", message: msg });
			});

		return () => ac.abort();
	}, [companyName]);

	const prefs = readPrefs();
	const pinnedSet = useMemo(
		() => new Set(prefs.pinnedCompanies),
		[prefs.pinnedCompanies],
	);

	const pinned = companyName ? pinnedSet.has(companyName) : false;
	const pinDisabled = !!companyName && !pinned && pinnedSet.size >= 5;

	const togglePin = () => {
		if (!companyName) return;

		const pinnedArr = Array.from(pinnedSet);
		const next = pinned
			? pinnedArr.filter((x) => x !== companyName)
			: clampPins([companyName, ...pinnedArr]);

		writePinnedCompanies(next);
		window.location.reload();
	};

	const files: readonly ManifestFile[] = useMemo(() => {
		if (state.kind !== "ready") return [];
		if (!filter) return state.company.files;
		return state.company.files.filter((f) =>
			f.name.toLowerCase().includes(filter),
		);
	}, [state, filter]);

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
								aria-label={pinned ? "Unpin company" : "Pin company"}
								title={pinDisabled ? "Pin limit reached (5)" : ""}
							>
								{pinned ? (
									<PinOff className="h-4 w-4" />
								) : (
									<Pin className="h-4 w-4" />
								)}
								<span className="hidden sm:inline">
									{pinned ? "Unpin" : "Pin"}
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

						<div className="glass p-6">
							<div className="text-base font-semibold">Quick stats (stub)</div>
							<div className="muted mt-3 text-sm leading-6">
								We’ll fill this once Dexie global completion is wired.
							</div>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}
