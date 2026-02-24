// file: src/components/layout/AppShell.tsx

import { Rocket, Search } from "lucide-react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Footer } from "./Footer";

function BackgroundBubbles() {
	const bubbles = [
		{ left: "6%", top: "12%", size: 520, delay: "0s" },
		{ left: "62%", top: "6%", size: 620, delay: "0.8s" },
		{ left: "40%", top: "64%", size: 760, delay: "1.3s" },
	] as const;

	return (
		<div className="bubbles" aria-hidden="true">
			{bubbles.map((b) => (
				<div
					key={`${b.left}-${b.top}-${b.size}`}
					className="bubble"
					style={{
						left: b.left,
						top: b.top,
						width: b.size,
						height: b.size,
						animationDelay: b.delay,
					}}
				/>
			))}
		</div>
	);
}

function TopNav() {
	const navigate = useNavigate();

	return (
		<header className="sticky top-0 z-20">
			<div className="container-x py-4">
				<div className="glass px-4 py-3 sm:px-5">
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => navigate("/")}
								className="btn btn-ghost"
								aria-label="Go to home"
							>
								<span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(99,102,241,0.16)]">
									<Rocket className="h-4 w-4" />
								</span>
								<span className="font-semibold tracking-tight">NefCode.io</span>
							</button>

							<nav className="hidden items-center gap-2 sm:flex">
								<NavLink
									to="/companies"
									className={({ isActive }) =>
										`btn btn-ghost ${isActive ? "underline" : ""}`
									}
								>
									Companies
								</NavLink>
								<NavLink
									to="/stats"
									className={({ isActive }) =>
										`btn btn-ghost ${isActive ? "underline" : ""}`
									}
								>
									Stats
								</NavLink>
							</nav>
						</div>

						<div className="hidden w-[460px] max-w-[48vw] items-center gap-2 md:flex">
							<div className="relative w-full">
								<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-70" />
								<input
									className="input pl-11"
									placeholder="Search (stub) - companies, lists, problems..."
									onChange={() => {
										// skeleton no-op
									}}
								/>
							</div>
							<Link className="btn btn-primary" to="/companies">
								Start
							</Link>
						</div>

						<div className="md:hidden">
							<Link className="btn btn-primary" to="/companies">
								Browse
							</Link>
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}

export function AppShell() {
	return (
		<div className="app-bg min-h-dvh">
			<BackgroundBubbles />
			<div className="relative z-10 flex min-h-dvh flex-col">
				<TopNav />
				<main className="flex-1">
					<Outlet />
				</main>
				<Footer />
			</div>
		</div>
	);
}
