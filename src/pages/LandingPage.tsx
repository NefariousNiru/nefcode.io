// file: src/pages/LandingPage.tsx

import { ArrowRight, CloudOff, Layers, ShieldCheck, Star } from "lucide-react";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchManifest } from "../data/manifest.ts";
import { formatListLabel } from "../domain/normalize";
import type { ManifestCompany } from "../domain/types.ts";
import {
	type CompanyLandingStats,
	getListSolvedTotal,
	getPinnedCompanyStats,
	type SolvedTotal,
} from "../stats/landingStats";
import { type RecentFile, readPrefs } from "../storage/prefs";

const DOT_COLORS = [
	"bg-indigo-500",
	"bg-emerald-500",
	"bg-rose-500",
	"bg-amber-500",
	"bg-sky-500",
] as const;

function FeatureCard({
	icon,
	title,
	desc,
}: {
	readonly icon: React.ReactNode;
	readonly title: string;
	readonly desc: string;
}) {
	return (
		<div className="card p-6">
			<div className="flex items-start gap-4">
				<div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(99,102,241,0.14)]">
					{icon}
				</div>
				<div>
					<div className="text-lg font-semibold">{title}</div>
					<div className="muted mt-1 text-sm leading-6">{desc}</div>
				</div>
			</div>
		</div>
	);
}

function DotTag({ children }: { readonly children: React.ReactNode }) {
	const randomColor = useMemo(
		() => DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
		[],
	);

	return (
		<span className="chip inline-flex items-center gap-2 px-3 py-1 text-sm">
			<span className={`h-2 w-2 rounded-full ${randomColor}`} />
			{children}
		</span>
	);
}

function listTypeIndex(label: string): number | null {
	const m = /^\s*(\d+)\.\s*/u.exec(label.trim());
	if (!m) return null;
	const n = Number(m[1]);
	return Number.isFinite(n) ? n : null;
}

function listTypeBadgeClass(idx: number | null): string {
	// 1 - green (30 days)
	// 2 - blue
	// 3 - violet
	// 4 - amber
	// 5 - slate
	if (idx === 1) return "text-[rgba(34,197,94,0.95)]";
	if (idx === 2) return "text-[rgba(59,130,246,0.95)]";
	if (idx === 3) return "text-[rgba(139,92,246,0.95)]";
	if (idx === 4) return "text-[rgba(245,158,11,0.95)]";
	if (idx === 5) return "text-[rgba(148,163,184,0.95)]";
	return "muted";
}

function listChipTone(idx: number | null): string {
	// background tint for the per-list x/y chip
	if (idx === 1) return "bg-[rgba(34,197,94,0.12)] text-[rgba(34,197,94,0.95)]";
	if (idx === 2)
		return "bg-[rgba(59,130,246,0.12)] text-[rgba(59,130,246,0.95)]";
	if (idx === 3)
		return "bg-[rgba(139,92,246,0.12)] text-[rgba(139,92,246,0.95)]";
	if (idx === 4)
		return "bg-[rgba(245,158,11,0.14)] text-[rgba(245,158,11,0.95)]";
	if (idx === 5)
		return "bg-[rgba(148,163,184,0.12)] text-[rgba(148,163,184,0.95)]";
	return "bg-[rgba(99,102,241,0.12)] text-[rgba(99,102,241,0.95)]";
}

type RecentStats = SolvedTotal;

async function computeRecentStats(
	manifestAt: string,
	recents: readonly RecentFile[],
	signal: AbortSignal,
): Promise<Map<string, RecentStats>> {
	const out = new Map<string, RecentStats>();

	const tasks = recents.map(async (r) => {
		const stats = await getListSolvedTotal({
			manifestAt,
			listUrl: r.url,
			signal,
		});
		out.set(r.url, stats);
	});

	await Promise.allSettled(tasks);
	return out;
}

export function LandingPage() {
	const [manifestAt, setManifestAt] = useState<string>("");
	const [prefs] = useState(() => readPrefs());

	const [recentStats, setRecentStats] = useState<Map<string, RecentStats>>(
		() => new Map(),
	);

	const [pinnedStats, setPinnedStats] = useState<
		ReadonlyMap<string, CompanyLandingStats>
	>(() => new Map());

	const [pinnedCompaniesFromManifest, setPinnedCompaniesFromManifest] =
		useState<readonly ManifestCompany[]>([]);

	const pinned = useMemo(
		() => prefs.pinnedCompanies.slice(0, 5),
		[prefs.pinnedCompanies],
	);
	const recents = useMemo(
		() => prefs.recentFiles.slice(0, 5),
		[prefs.recentFiles],
	);

	useEffect(() => {
		if (!manifestAt) return;

		if (recents.length === 0) {
			setRecentStats(new Map());
			return;
		}

		const ac = new AbortController();
		computeRecentStats(manifestAt, recents, ac.signal)
			.then((m) => {
				if (ac.signal.aborted) return;
				setRecentStats(m);
			})
			.catch(() => {
				if (ac.signal.aborted) return;
				setRecentStats(new Map());
			});

		return () => ac.abort();
	}, [manifestAt, recents]);

	useEffect(() => {
		const ac = new AbortController();

		// Load manifest only to expand pinned companies -> their files
		fetchManifest(ac.signal)
			.then((m) => {
				if (ac.signal.aborted) return;
				setManifestAt(m.generatedAt || ""); // stable-ish key
				const pinnedCompanies = m.companies.filter((c) =>
					pinned.includes(c.name),
				);
				setPinnedCompaniesFromManifest(pinnedCompanies);
			})
			.catch(() => {
				if (ac.signal.aborted) return;
				setPinnedCompaniesFromManifest([]);
			});

		return () => ac.abort();
	}, [pinned]);

	useEffect(() => {
		if (!manifestAt) return;

		if (pinnedCompaniesFromManifest.length === 0) {
			setPinnedStats(new Map());
			return;
		}

		const ac = new AbortController();
		setPinnedStats(new Map());

		const run = async () => {
			for (const c of pinnedCompaniesFromManifest) {
				if (ac.signal.aborted) return;

				try {
					const s = await getPinnedCompanyStats({
						manifestAt,
						company: c,
						signal: ac.signal,
					});

					setPinnedStats((prev) => {
						const merged = new Map(prev);
						merged.set(c.name, s);
						return merged;
					});
				} catch {
					// ignore per-company failures
				}
			}
		};

		void run();
		return () => ac.abort();
	}, [manifestAt, pinnedCompaniesFromManifest]);

	const pinnedLinks = useMemo(
		() =>
			pinned.map((c) => ({
				name: c,
				to: `/companies/${encodeURIComponent(c)}`,
			})),
		[pinned],
	);

	return (
		<div className="container-x py-10 sm:py-14">
			<section className="glass p-7 sm:p-10">
				<div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
					<div className="max-w-2xl">
						<div className="chip inline-flex items-center gap-2 px-3 py-1 text-sm">
							<Star className="h-4 w-4" />
							Offline-first. No sign-up needed.
						</div>

						<h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
							Solve once. Track once.
							<span className="block text-[rgba(99,102,241,0.95)]">
								Counts for every company.
							</span>
						</h1>

						<p className="muted mt-4 text-base leading-7 sm:text-lg">
							NefCode.io is a company-based focussed LeetCode© problem tracker
							built for targeted preparation and offline use.
						</p>

						<div className="mt-7 flex flex-col gap-3 sm:flex-row">
							<Link to="/companies" className="btn btn-primary">
								Browse companies <ArrowRight className="h-4 w-4" />
							</Link>
						</div>

						<div className="mt-7 flex flex-wrap gap-2">
							<DotTag>Offline-first</DotTag>
							<DotTag>Data Privacy</DotTag>
							<DotTag>Fun Stats</DotTag>
							<DotTag>Time + Note Taker</DotTag>
						</div>
					</div>

					{/* Pinned + Recents in two columns on large screens */}
					<div className="grid w-full gap-4 lg:max-w-3xl lg:grid-cols-2">
						{/* PINNED */}
						<div className="card p-6">
							<div className="flex items-center justify-between">
								<div className="text-base font-semibold">Pinned Companies</div>
								<div className="chip px-3 py-1 text-xs">Up to 5</div>
							</div>

							<div className="mt-4">
								{pinnedLinks.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-4">
										No pins yet. Pin companies from the Companies page.
									</div>
								) : (
									<ul className="space-y-3">
										{pinnedLinks.map((c) => {
											const stats = pinnedStats.get(c.name);
											const overall = stats?.overall;

											return (
												<li
													key={c.name}
													className="rounded-2xl border border-[rgb(var(--border))] p-3"
												>
													<Link
														to={c.to}
														className="btn btn-ghost w-full justify-between"
														aria-label={`Open ${c.name}`}
													>
														<span className="truncate font-medium text-[rgb(var(--fg))]">
															{c.name}
														</span>

														<span className="chip px-3 py-1 text-xs">
															{overall
																? `${overall.solved}/${overall.total}`
																: "…"}
														</span>
													</Link>

													{/* per-list chips (30 days / 3 months / etc) */}
													{stats ? (
														<div className="mt-3 flex flex-wrap gap-2">
															{pinnedCompaniesFromManifest
																.find((x) => x.name === c.name)
																?.files.map((f) => {
																	const idx = listTypeIndex(f.name);
																	const cls = listChipTone(idx);
																	const label = formatListLabel(f.name);
																	const st = stats.perList.get(f.url);

																	return (
																		<span
																			key={f.url}
																			className={`chip inline-flex items-center gap-2 px-3 py-1 text-xs ${cls}`}
																			title={f.name}
																		>
																			<span className="opacity-90">
																				{label}
																			</span>
																			<span className="font-semibold">
																				{st ? `${st.solved}/${st.total}` : "…"}
																			</span>
																		</span>
																	);
																})}
														</div>
													) : null}
												</li>
											);
										})}
									</ul>
								)}
							</div>
						</div>

						{/* RECENTS */}
						<div className="card p-6">
							<div className="flex items-center justify-between">
								<div className="text-base font-semibold">Recent Lists</div>
								<div className="chip px-3 py-1 text-xs">Local</div>
							</div>

							<div className="mt-4">
								{recents.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-4">
										No recent lists. Open a list to see it here.
									</div>
								) : (
									<ul className="space-y-2">
										{recents.map((r) => {
											const idx = listTypeIndex(r.label);
											const typeCls = listTypeBadgeClass(idx);

											const stats = recentStats.get(r.url);
											const solved = stats?.solved ?? 0;
											const total = stats?.total ?? 0;

											const listLabel = formatListLabel(r.label);

											const to = `/preview?company=${encodeURIComponent(
												r.company,
											)}&label=${encodeURIComponent(r.label)}&url=${encodeURIComponent(
												r.url,
											)}`;

											return (
												<li key={r.url}>
													<Link
														to={to}
														className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] p-3 hover:bg-[rgba(var(--fg),0.03)]"
														aria-label={`Open ${r.company} ${listLabel}`}
													>
														<div className="min-w-0">
															<div className="truncate font-medium text-[rgb(var(--fg))]">
																{r.company}
															</div>
															<div className={`truncate text-xs ${typeCls}`}>
																{listLabel}
															</div>
														</div>

														<span className="chip px-3 py-1 text-xs">
															{total > 0 ? `${solved}/${total}` : "…"}
														</span>
													</Link>
												</li>
											);
										})}
									</ul>
								)}
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2">
				<FeatureCard
					icon={<CloudOff className="h-5 w-5" />}
					title="Offline-first"
					desc="After first load, browse lists and track progress without internet."
				/>
				<FeatureCard
					icon={<Layers className="h-5 w-5" />}
					title="Solve once"
					desc="No duplicate tracking across companies to track progress and eligibilty across orgs."
				/>
				<FeatureCard
					icon={<ShieldCheck className="h-5 w-5" />}
					title="No accounts"
					desc="No signup, no server, no tracking. Your progress stays in your browser."
				/>
				<FeatureCard
					icon={<Star className="h-5 w-5" />}
					title="Fast UX"
					desc="Clean browse pages and smooth filtering. Keyboard-first flows next."
				/>
			</section>
		</div>
	);
}
