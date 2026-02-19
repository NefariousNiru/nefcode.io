// file: src/pages/LandingPage.tsx

import { ArrowRight, CloudOff, Layers, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { readPrefs } from "../storage/prefs";

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

export function LandingPage() {
	const prefs = readPrefs();
	const pinned = prefs.pinnedCompanies.slice(0, 5);
	const recents = prefs.recentFiles.slice(0, 5);

	return (
		<div className="container-x py-10 sm:py-14">
			<section className="glass p-7 sm:p-10">
				<div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
					<div className="max-w-2xl">
						<div className="chip inline-flex items-center gap-2 px-3 py-1 text-sm">
							<Star className="h-4 w-4" />
							Offline-first. Zero accounts.
						</div>

						<h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
							Solve once. Track once.
							<span className="block text-[rgba(99,102,241,0.95)]">
								Counts for every company.
							</span>
						</h1>

						<p className="muted mt-4 text-base leading-7 sm:text-lg">
							NefCode.io is a company-wise LeetCode problem tracker built for
							speed, offline use, and global deduplication by problem URL.
						</p>

						<div className="mt-7 flex flex-col gap-3 sm:flex-row">
							<Link to="/companies" className="btn btn-primary">
								Browse companies <ArrowRight className="h-4 w-4" />
							</Link>
							<Link to="/health" className="btn">
								Run health check
							</Link>
						</div>

						<div className="mt-7 flex flex-wrap gap-2">
							<span className="chip px-3 py-1 text-sm">Global completion</span>
							<span className="chip px-3 py-1 text-sm">Offline-first</span>
							<span className="chip px-3 py-1 text-sm">No backend</span>
							<span className="chip px-3 py-1 text-sm">Fast browsing</span>
						</div>
					</div>

					<div className="grid w-full max-w-xl gap-4">
						<div className="card p-6">
							<div className="flex items-center justify-between">
								<div className="text-base font-semibold">Pinned companies</div>
								<div className="chip px-3 py-1 text-xs">up to 5</div>
							</div>
							<div className="muted mt-3 text-sm">
								{pinned.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-4">
										No pins yet. Pin companies from the Companies page.
									</div>
								) : (
									<ul className="grid grid-cols-1 gap-2">
										{pinned.map((c) => (
											<li key={c} className="chip px-3 py-2 text-sm">
												{c}
											</li>
										))}
									</ul>
								)}
							</div>
						</div>

						<div className="card p-6">
							<div className="flex items-center justify-between">
								<div className="text-base font-semibold">Recent lists</div>
								<div className="chip px-3 py-1 text-xs">local</div>
							</div>
							<div className="muted mt-3 text-sm">
								{recents.length === 0 ? (
									<div className="rounded-2xl border border-dashed border-[rgb(var(--border))] p-4">
										No recent files. Open a list to see it here.
									</div>
								) : (
									<ul className="space-y-2">
										{recents.map((r) => (
											<li
												key={r.url}
												className="flex items-center justify-between gap-3 rounded-2xl border border-[rgb(var(--border))] p-3"
											>
												<div className="min-w-0">
													<div className="truncate font-medium text-[rgb(var(--fg))]">
														{r.company}
													</div>
													<div className="muted truncate text-xs">
														{r.label}
													</div>
												</div>
												<div className="chip px-3 py-1 text-xs">opened</div>
											</li>
										))}
									</ul>
								)}
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
				<FeatureCard
					icon={<CloudOff className="h-5 w-5" />}
					title="Offline-first"
					desc="After first load, browse lists and track progress without internet."
				/>
				<FeatureCard
					icon={<Layers className="h-5 w-5" />}
					title="Solve once"
					desc="Problem identity is the LeetCode URL. No duplicate tracking across companies."
				/>
				<FeatureCard
					icon={<ShieldCheck className="h-5 w-5" />}
					title="No accounts"
					desc="No signup, no server, no tracking. Your progress stays in your browser."
				/>
				<FeatureCard
					icon={<Star className="h-5 w-5" />}
					title="Fast UX"
					desc="Keyboard-first flows, clean browse pages, and smooth filtering (next)."
				/>
			</section>
		</div>
	);
}
