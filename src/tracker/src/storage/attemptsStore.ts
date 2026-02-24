// file: tracker/src/storage/attemptsStore.ts

import type { Attempt, DraftAttempt } from "../shared/types";

const KEY_ATTEMPTS = "nefcode.tracker.attempts.v1";

function draftKey(draftId: string) {
	return `nefcode.tracker.draft.${draftId}`;
}

type AttemptsPayload = { readonly attempts: readonly Attempt[] };

function safeParse<T>(raw: string | undefined): T | null {
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

async function getAllAttempts(): Promise<Attempt[]> {
	const res = await chrome.storage.local.get(KEY_ATTEMPTS);
	const parsed = safeParse<AttemptsPayload>(
		res[KEY_ATTEMPTS] as string | undefined,
	);
	return Array.isArray(parsed?.attempts) ? [...parsed.attempts] : [];
}

async function putAllAttempts(attempts: readonly Attempt[]): Promise<void> {
	await chrome.storage.local.set({
		[KEY_ATTEMPTS]: JSON.stringify({ attempts } satisfies AttemptsPayload),
	});
}

export async function insertAttempt(a: Attempt): Promise<void> {
	const all = await getAllAttempts();
	all.push(a);

	const trimmed = all.sort((x, y) => x.createdAt - y.createdAt).slice(-2000);
	await putAllAttempts(trimmed);
}

export async function listAttempts(since?: number): Promise<Attempt[]> {
	const all = await getAllAttempts();
	const filtered =
		typeof since === "number" && Number.isFinite(since)
			? all.filter((a) => a.createdAt >= since)
			: all;

	filtered.sort((a, b) => b.createdAt - a.createdAt);
	return filtered;
}

export async function deleteAttempts(
	attemptIds: readonly string[],
): Promise<void> {
	if (attemptIds.length === 0) return;
	const set = new Set(attemptIds);
	const all = await getAllAttempts();
	const kept = all.filter((a) => !set.has(a.attemptId));
	if (kept.length !== all.length) await putAllAttempts(kept);
}

// ---- drafts (ephemeral handoff) ----

export async function putDraft(
	draftId: string,
	d: DraftAttempt,
): Promise<void> {
	await chrome.storage.session.set({ [draftKey(draftId)]: d });
}

export async function getDraft(draftId: string): Promise<DraftAttempt | null> {
	const res = await chrome.storage.session.get(draftKey(draftId));
	const v = res[draftKey(draftId)] as DraftAttempt | undefined;
	if (!v || typeof v !== "object") return null;
	return v;
}

export async function deleteDraft(draftId: string): Promise<void> {
	await chrome.storage.session.remove(draftKey(draftId));
}
