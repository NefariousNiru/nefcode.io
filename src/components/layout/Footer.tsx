// file: src/components/layout/Footer.tsx

import { Github, Linkedin, Monitor, Moon, Sun, Youtube } from "lucide-react";
import type * as React from "react";
import { useTheme } from "../../theme/useTheme";

type ThemeValue = "light" | "dark" | "system";

function ThemeButton({
	value,
	label,
	icon,
	active,
	onSelect,
}: {
	readonly value: ThemeValue;
	readonly label: string;
	readonly icon: React.ReactNode;
	readonly active: boolean;
	readonly onSelect: (v: ThemeValue) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => onSelect(value)}
			className={`btn ${active ? "btn-primary" : ""}`}
			aria-pressed={active}
			aria-label={label}
		>
			{icon}
			<span className="hidden sm:inline">{label}</span>
		</button>
	);
}

function ThemeSwitcher() {
	const { preference, setPreference } = useTheme();

	return (
		<div className="flex items-center justify-center gap-2">
			<ThemeButton
				value="light"
				label="Light"
				icon={<Sun className="h-4 w-4" />}
				active={preference === "light"}
				onSelect={setPreference}
			/>
			<ThemeButton
				value="dark"
				label="Dark"
				icon={<Moon className="h-4 w-4" />}
				active={preference === "dark"}
				onSelect={setPreference}
			/>
			<ThemeButton
				value="system"
				label="System"
				icon={<Monitor className="h-4 w-4" />}
				active={preference === "system"}
				onSelect={setPreference}
			/>
		</div>
	);
}

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="container-x py-10">
			<div className="glass px-5 py-5">
				<div className="grid gap-6 md:grid-cols-3 md:items-center">
					{/* Left */}
					<div className="text-center md:text-left">
						<div className="font-semibold tracking-tight text-[rgb(var(--fg))]">
							NefCode.io
						</div>
						<div className="muted mt-1 text-sm">© {year}</div>
					</div>

					{/* Middle */}
					<div className="flex justify-center">
						<ThemeSwitcher />
					</div>

					{/* Right */}
					<div className="flex flex-col items-center gap-3 md:items-end">
						<div className="muted text-sm">
							<span className="opacity-80">Data Source Credits:</span>{" "}
							<a
								className="link"
								href="https://github.com/liquidslr/interview-company-wise-problems/tree/main"
								target="_blank"
								rel="noreferrer"
							>
								liquidslr
							</a>
						</div>

						<div className="muted text-sm">
							<a
								className="link inline-flex items-center gap-2"
								href="https://www.youtube.com/@NeetCode"
								target="_blank"
								rel="noreferrer"
							>
								<Youtube className="h-4 w-4" />
								<span>NeetCode</span>
							</a>
						</div>

						<div className="flex items-center gap-2">
							<span> Reach out: </span>
							<a
								className="btn"
								href="https://github.com/NefariousNiru"
								target="_blank"
								rel="noreferrer"
								aria-label="GitHub"
							>
								<Github className="h-4 w-4" />
								<span className="hidden sm:inline">GitHub</span>
							</a>
							<a
								className="btn"
								href="https://www.linkedin.com/in/nbroy"
								target="_blank"
								rel="noreferrer"
								aria-label="LinkedIn"
							>
								<Linkedin className="h-4 w-4" />
								<span className="hidden sm:inline">LinkedIn</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
