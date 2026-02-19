// file: src/components/layout/Footer.tsx

import { Github, Linkedin, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "../../theme/useTheme";

function ThemeSwitcher() {
	const { preference, setPreference } = useTheme();

	const Btn = ({
		value,
		label,
		icon,
	}: {
		readonly value: "light" | "dark" | "system";
		readonly label: string;
		readonly icon: React.ReactNode;
	}) => {
		const active = preference === value;
		return (
			<button
				type="button"
				onClick={() => setPreference(value)}
				className={`btn ${active ? "btn-primary" : ""}`}
				aria-pressed={active}
				aria-label={label}
			>
				{icon}
				<span className="hidden sm:inline">{label}</span>
			</button>
		);
	};

	return (
		<div className="flex items-center gap-2">
			<Btn value="light" label="Light" icon={<Sun className="h-4 w-4" />} />
			<Btn value="dark" label="Dark" icon={<Moon className="h-4 w-4" />} />
			<Btn
				value="system"
				label="System"
				icon={<Monitor className="h-4 w-4" />}
			/>
		</div>
	);
}

export function Footer() {
	const year = new Date().getFullYear();

	return (
		<footer className="container-x py-10">
			<div className="glass px-5 py-5">
				<div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
					<div className="muted text-sm">
						<span className="font-medium text-[rgb(var(--fg))]">
							NefCode.io
						</span>{" "}
						<div className="opacity-70">© {year}</div>
					</div>

					<div className="flex flex-col gap-3 md:items-end">
						<div className="flex items-center gap-2">
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

					<div className="flex justify-center">
						<ThemeSwitcher />
					</div>

					<div className="flex flex-col gap-3 md:items-end">
						<div className="flex items-center gap-2">
							<div className="muted text-sm">
								<span className="opacity-80">Data Source Credits:</span>{" "}
								<a
									className="link"
									href="https://github.com/liquidslr/interview-company-wise-problems/tree/main"
									target="_blank"
									rel="noreferrer"
								>
									&nbsp; liquidslr
								</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
