// file: tracker/src/save/save.ts

import { fmtMinutes } from "../shared/normalize";
import type { DraftAttempt, RuntimeResponse } from "../shared/types";

const LOG = (...args: unknown[]) => console.log("[nefcode-tracker]", ...args);

function qs(name: string): string | null {
	return new URL(window.location.href).searchParams.get(name);
}

function el<T extends HTMLElement>(id: string): T {
	const node = document.getElementById(id);
	if (!node) throw new Error(`Missing element: ${id}`);
	return node as T;
}

function esc(s: string): string {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function difficultyChip(d: string): string {
	if (d === "EASY") return "Easy";
	if (d === "MEDIUM") return "Medium";
	if (d === "HARD") return "Hard";
	return "Unknown";
}

async function loadDraft(draftId: string): Promise<DraftAttempt | null> {
	const res = (await chrome.runtime.sendMessage({
		kind: "DRAFT_GET",
		draftId,
	})) as RuntimeResponse;

	if (!res.ok) throw new Error(res.error);
	return (res.draft ?? null) as DraftAttempt | null;
}

async function discardDraft(draftId: string): Promise<void> {
	await chrome.runtime.sendMessage({ kind: "DRAFT_DISCARD", draftId });
}

async function saveDraft(
	draftId: string,
	notes: string | null,
): Promise<RuntimeResponse> {
	return (await chrome.runtime.sendMessage({
		kind: "DRAFT_SAVE",
		draftId,
		notes,
	})) as RuntimeResponse;
}

async function main() {
	const draftId = qs("draftId");
	const meta = el<HTMLDivElement>("meta");
	const status = el<HTMLDivElement>("status");

	const closeBtn = el<HTMLButtonElement>("closeBtn");
	const saveBtn = el<HTMLButtonElement>("saveBtn");
	const cancelBtn = el<HTMLButtonElement>("discardBtn");
	const notesEl = el<HTMLTextAreaElement>("notes");

	if (!draftId) {
		meta.innerHTML = `<div class="muted">Missing draftId.</div>`;
		return;
	}

	let draft: DraftAttempt | null = null;
	try {
		draft = await loadDraft(draftId);
	} catch (e: unknown) {
		meta.innerHTML = `<div class="muted">Failed to load.</div>`;
		status.textContent = e instanceof Error ? e.message : "Unknown error";
		return;
	}

	if (!draft) {
		meta.innerHTML = `<div class="muted">Draft missing (stale window).</div>`;
		return;
	}

	const mins = fmtMinutes(draft.elapsedSec);

	meta.innerHTML = `
		<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start;">
			<div style="min-width:0;">
				<div style="font-weight:900; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
					Accepted - ${esc(draft.title)}
				</div>
				<div class="muted" style="font-size:12px; margin-top:4px; word-break:break-all;">
					${esc(draft.problemLink)}
				</div>
			</div>
			<div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:flex-end;">
				<span class="chip">${esc(difficultyChip(draft.difficulty))}</span>
				<span class="chip">${esc(mins)} min</span>
			</div>
		</div>
	`;

	const closeAll = async () => {
		await discardDraft(draftId);
		window.close();
	};

	closeBtn.addEventListener("click", () => void closeAll());

	cancelBtn.addEventListener("click", async () => {
		cancelBtn.disabled = true;
		saveBtn.disabled = true;
		status.textContent = "Canceled.";
		await discardDraft(draftId);
		window.close();
	});

	saveBtn.addEventListener("click", async () => {
		saveBtn.disabled = true;
		cancelBtn.disabled = true;
		status.textContent = "Saving...";

		const raw = notesEl.value.trim();
		const notes = raw.length ? raw : null;

		const res = await saveDraft(draftId, notes);
		if (!res.ok) {
			status.textContent = res.error;
			saveBtn.disabled = false;
			cancelBtn.disabled = false;
			return;
		}

		LOG("saved", draft.attemptId);
		status.textContent = "Saved.";
		window.close();
	});
}

void main();
