// file: tracker/src/background.ts

import { uuidv4 } from "./shared/ids";
import type { Attempt, RuntimeRequest, RuntimeResponse } from "./shared/types";
import {
	deleteAttempts,
	deleteDraft,
	getDraft,
	insertAttempt,
	listAttempts,
	putDraft,
} from "./storage/attemptsStore";

const LOG = (...args: unknown[]) => console.log("[nefcode-tracker]", ...args);
const WARN = (...args: unknown[]) => console.warn("[nefcode-tracker]", ...args);

LOG("background boot");

const NEFCODE_URL = "https://nefariousniru.github.io/nefcode.io/";

const ICON_DEFAULT = {
	16: chrome.runtime.getURL("icons/default_128.png"),
	32: chrome.runtime.getURL("icons/default_128.png"),
	48: chrome.runtime.getURL("icons/default_128.png"),
	128: chrome.runtime.getURL("icons/default_128.png"),
} as const;

const ICON_ACTIVE = {
	16: chrome.runtime.getURL("icons/active_128.png"),
	32: chrome.runtime.getURL("icons/active_128.png"),
	48: chrome.runtime.getURL("icons/active_128.png"),
	128: chrome.runtime.getURL("icons/active_128.png"),
} as const;

function setActionIcon(active: boolean) {
	chrome.action.setIcon({ path: active ? ICON_ACTIVE : ICON_DEFAULT }, () => {
		const err = chrome.runtime.lastError;
		if (err) WARN("setIcon failed:", err.message);
	});
}

function openNefcode(): void {
	void chrome.tabs.create({ url: NEFCODE_URL });
}

chrome.action.onClicked.addListener(() => openNefcode());

// ---- circuit breaker: stop popup storms ----
let popupInFlight = false;
let lastPopupAt = 0;
const POPUP_COOLDOWN_MS = 10_000;

function canOpenPopupNow(): boolean {
	const now = Date.now();
	if (popupInFlight) return false;
	if (now - lastPopupAt < POPUP_COOLDOWN_MS) return false;
	popupInFlight = true;
	lastPopupAt = now;
	return true;
}

async function openSaveUI(draftId: string): Promise<void> {
	const url = chrome.runtime.getURL(
		`dist/save/save.html?draftId=${encodeURIComponent(draftId)}`,
	);

	// Preferred: popup
	try {
		const win = await chrome.windows.create({
			url,
			type: "popup",
			width: 720,
			height: 620,
			focused: true,
		});
		if (!win?.id) throw new Error("Popup create returned no window id");
		LOG("opened popup window", win.id, "draft", draftId);
		return;
	} catch (e: unknown) {
		WARN(
			"popup open failed, fallback to tab:",
			e instanceof Error ? e.message : e,
		);
	}

	await chrome.tabs.create({ url });
}

chrome.runtime.onMessage.addListener(
	(req: RuntimeRequest, _sender, sendResponse) => {
		const run = async (): Promise<RuntimeResponse> => {
			try {
				switch (req.kind) {
					case "ICON_SET": {
						setActionIcon(!!req.active);
						return { ok: true };
					}

					case "OPEN_SAVE_POPUP": {
						if (!canOpenPopupNow()) {
							WARN("OPEN_SAVE_POPUP suppressed (cooldown/in-flight)");
							return { ok: true };
						}

						const draftId = uuidv4();
						await putDraft(draftId, req.draft);
						LOG("draft stored", draftId);

						try {
							await openSaveUI(draftId);
						} finally {
							popupInFlight = false;
						}

						return { ok: true };
					}

					case "DRAFT_GET": {
						const d = await getDraft(req.draftId);
						LOG("draft get", req.draftId, "found:", !!d);
						return { ok: true, draft: d };
					}

					case "DRAFT_SAVE": {
						const d = await getDraft(req.draftId);
						if (!d) return { ok: false, error: "Draft not found." };

						const attempt: Attempt = { ...d, notes: req.notes ?? null };
						await insertAttempt(attempt);
						await deleteDraft(req.draftId);
						LOG("saved attempt", attempt.attemptId);
						return { ok: true };
					}

					case "DRAFT_DISCARD": {
						await deleteDraft(req.draftId);
						LOG("draft discarded", req.draftId);
						return { ok: true };
					}

					case "GET_ATTEMPTS": {
						return { ok: true, attempts: await listAttempts(req.since) };
					}

					case "ACK_IMPORTED": {
						await deleteAttempts(req.attemptIds);
						return { ok: true };
					}

					default:
						return { ok: false, error: "Unknown request" };
				}
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : "Unknown error";
				WARN("handler error:", msg);
				return { ok: false, error: msg };
			}
		};

		void run().then(sendResponse);
		return true;
	},
);
