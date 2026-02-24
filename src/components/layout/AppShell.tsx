// file: src/components/layout/AppShell.tsx

import { Menu, Rocket, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Footer } from "./Footer";
import { GlobalSearch } from "./GlobalSearch";

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
	const [mobileOpen, setMobileOpen] = useState(false);

	const panelRef = useRef<HTMLDivElement | null>(null);
	const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

	// Close on route change (prevents "stuck open" after navigation)
	useEffect(() => {
		setMobileOpen(false);
	}, []);

	// Close on Escape + outside click/tap
	useEffect(() => {
		if (!mobileOpen) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMobileOpen(false);
		};

		const onPointerDown = (e: PointerEvent) => {
			const target = e.target as Node | null;
			if (!target) return;

			const panel = panelRef.current;
			const toggle = toggleBtnRef.current;

			// If click is inside panel or on toggle button, ignore
			if (panel?.contains(target)) return;
			if (toggle?.contains(target)) return;

			setMobileOpen(false);
		};

		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown, { capture: true });

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown, {
				capture: true,
			});
		};
	}, [mobileOpen]);

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

						<div className="hidden md:flex items-center ml-auto">
							<div
								className="
                                          relative
                                          w-[560px] max-w-[56vw]
                                          md:w-[620px] md:max-w-[52vw]
                                          lg:w-[760px] lg:max-w-none
                                        "
							>
								<GlobalSearch />
							</div>
						</div>

						{/* Mobile */}
						<div className="flex items-center gap-2 md:hidden">
							<button
								ref={toggleBtnRef}
								type="button"
								className="btn btn-ghost"
								onClick={() => setMobileOpen((v) => !v)}
								aria-label={mobileOpen ? "Close menu" : "Open menu"}
								aria-expanded={mobileOpen}
								aria-controls="mobile-menu"
							>
								{mobileOpen ? (
									<X className="h-5 w-5" />
								) : (
									<Menu className="h-5 w-5" />
								)}
							</button>

							<Link className="btn btn-primary" to="/companies">
								Browse
							</Link>
						</div>
					</div>

					{/* Mobile menu panel */}
					{mobileOpen ? (
						<div className="mt-3 md:hidden" id="mobile-menu" ref={panelRef}>
							<div className="card p-4">
								<div className="relative mt-3">
									<GlobalSearch placeholder="Search…" />
								</div>

								<div className="mt-4 grid grid-cols-2 gap-2">
									<Link className="btn" to="/companies">
										Browse Companies
									</Link>
									<Link className="btn" to="/stats">
										See Stats
									</Link>
								</div>

								<div className="mt-3 muted text-xs">
									Tap outside the menu to close.
								</div>
							</div>
						</div>
					) : null}
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
