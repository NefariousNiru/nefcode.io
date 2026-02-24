// file: src/components/ui/ProblemNoteModal.tsx

import { Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Difficulty } from "../../domain/types";
import type { ProblemProgress } from "../../storage/db";
import { setMinutes, setNotes } from "../../storage/progress";

type Props = {
	readonly open: boolean;
	readonly onClose: () => void;

	readonly link: string;
	readonly title: string;
	readonly difficulty: Difficulty;

	/** current progress snapshot from Dexie (can be undefined if no row yet) */
	readonly progress: ProblemProgress | undefined;
};

function parseMinutes(raw: string): number | null {
	const s = raw.trim();
	if (!s) return null;
	const n = Number(s);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.round(n);
}

export function ProblemNoteModal(props: Props) {
	const { open, onClose, link, title, difficulty, progress } = props;

	const initialMinutes = useMemo(() => {
		const m = progress?.minutes;
		return m === null || m === undefined ? "" : String(m);
	}, [progress?.minutes]);

	const initialNotes = useMemo(() => progress?.notes ?? "", [progress?.notes]);

	const [minutesText, setMinutesText] = useState<string>(initialMinutes);
	const [notesText, setNotesText] = useState<string>(initialNotes);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Sync form when opening or when progress changes.
	useEffect(() => {
		if (!open) return;
		setMinutesText(initialMinutes);
		setNotesText(initialNotes);
		setError(null);
	}, [open, initialMinutes, initialNotes]);

	// Close on Escape
	useEffect(() => {
		if (!open) return;

		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};

		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	if (!open) return null;

	const save = async () => {
		setSaving(true);
		setError(null);

		try {
			const minutes = parseMinutes(minutesText);
			const notes = notesText.trim() ? notesText : null;

			// Both are global per link. Create row if missing.
			await setMinutes(link, minutes, difficulty);
			await setNotes(link, notes, difficulty);

			onClose();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Failed to save";
			setError(msg);
		} finally {
			setSaving(false);
		}
	};

	const clearAll = async () => {
		setSaving(true);
		setError(null);

		try {
			await setMinutes(link, null, difficulty);
			await setNotes(link, null, difficulty);
			onClose();
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Failed to clear";
			setError(msg);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Edit time and notes"
		>
			{/* backdrop */}
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-label="Close modal"
			/>

			{/* modal */}
			<div className="relative w-full max-w-2xl">
				<div className="glass p-6">
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<div className="text-lg font-semibold">Notes</div>
							<div className="muted mt-1 text-sm line-clamp-2">{title}</div>
							<div className="muted mt-1 text-xs break-all">{link}</div>
						</div>

						<button
							type="button"
							className="btn btn-ghost"
							onClick={onClose}
							aria-label="Close"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					<div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
						<label htmlFor="minutes" className="muted text-xs">
							Minutes
						</label>
						<input
							className="input mt-2"
							inputMode="numeric"
							placeholder="e.g. 25"
							value={minutesText}
							onChange={(e) => setMinutesText(e.target.value)}
							disabled={saving}
						/>

						<label htmlFor="notes" className="muted text-xs">
							Notes
						</label>
						<textarea
							className="input mt-2 min-h-[140px] resize-y"
							placeholder="Key idea, pitfalls, pattern, edge cases..."
							value={notesText}
							onChange={(e) => setNotesText(e.target.value)}
							disabled={saving}
						/>
					</div>

					{error ? (
						<div className="mt-4 text-sm text-red-500">{error}</div>
					) : null}

					<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
						<button
							type="button"
							className="btn"
							onClick={() => void clearAll()}
							disabled={saving}
						>
							<Trash2 className="h-4 w-4" />
							Clear
						</button>

						<button
							type="button"
							className="btn btn-primary"
							onClick={() => void save()}
							disabled={saving}
						>
							<Save className="h-4 w-4" />
							Save
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
