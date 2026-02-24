// file: tracker/src/content_leetcode.ts

import { uuidv4 } from "./shared/ids";
import {
	fmtMinutes,
	normalizeProblemLink,
	parseDifficulty,
} from "./shared/normalize";
import type { Difficulty, DraftAttempt, RuntimeResponse } from "./shared/types";

const LOG = (...args: unknown[]) => console.log("[nefcode-tracker]", ...args);
const WARN = (...args: unknown[]) => console.warn("[nefcode-tracker]", ...args);

function getProblemSlugFromPath(pathname: string): string | null {
	const m = /^\/problems\/([^/]+)(?:\/|$)/u.exec(pathname);
	return m?.[1] ? decodeURIComponent(m[1]) : null;
}

function isLeetCodeProblemPage(): boolean {
	return getProblemSlugFromPath(window.location.pathname) !== null;
}

function getProblemLink(): string {
	const slug = getProblemSlugFromPath(window.location.pathname);
	if (!slug) return normalizeProblemLink(window.location.href);
	return `https://leetcode.com/problems/${encodeURIComponent(slug)}`;
}

function getTitleBestEffort(): string {
	const base = (document.title.split("-")[0] ?? "").trim();
	return base || "Untitled";
}

function getDifficultyBestEffort(): Difficulty {
	const candidates: Element[] = [];

	const a = document.querySelector('div[class*="text-difficulty-"]');
	if (a) candidates.push(a);

	const b = document.querySelector("[data-difficulty]");
	if (b) candidates.push(b);

	for (const el of candidates) {
		const t = (el.textContent ?? "").trim();
		if (t) return parseDifficulty(t);
	}
	return "UNKNOWN";
}

function readSubmissionResultText(): string {
	const el = document.querySelector(
		'span[data-e2e-locator="submission-result"]',
	);
	return (el?.textContent ?? "").trim();
}

function shouldStartFromEvent(e: Event): boolean {
	if (e instanceof KeyboardEvent) {
		if (
			e.key === "Shift" ||
			e.key === "Alt" ||
			e.key === "Meta" ||
			e.key === "Control"
		)
			return false;
	}
	return true;
}

function setIcon(active: boolean): void {
	void chrome.runtime.sendMessage({ kind: "ICON_SET", active });
}

// ---- in-memory timer ----
let startTime: number | null = null;
let startedForLink: string | null = null;
let startedTitle: string | null = null;
let startedDifficulty: Difficulty | null = null;

// hard local cooldown too (avoid spamming bg)
let lastFinalizeAt = 0;
const FINALIZE_COOLDOWN_MS = 10_000;

function canFinalizeNow(): boolean {
	const now = Date.now();
	if (now - lastFinalizeAt < FINALIZE_COOLDOWN_MS) return false;
	lastFinalizeAt = now;
	return true;
}

let finalizeGuardKey: string | null = null;

function startTimerIfNeeded(): void {
	if (startTime !== null) return;
	if (!isLeetCodeProblemPage()) return;

	startTime = Date.now();
	startedForLink = getProblemLink();
	startedTitle = getTitleBestEffort();
	startedDifficulty = getDifficultyBestEffort();

	setIcon(true);
	LOG("timer started", startedForLink);
}

function resetTimer(): void {
	startTime = null;
	startedForLink = null;
	startedTitle = null;
	startedDifficulty = null;
	finalizeGuardKey = null;

	setIcon(false);
	LOG("timer reset");
}

async function finalizeAccepted(): Promise<void> {
	if (!startTime) return;

	const problemLink = startedForLink ?? getProblemLink();
	const guard = `${problemLink}::${startTime}`;
	if (finalizeGuardKey === guard) return;
	finalizeGuardKey = guard;

	const endedAt = Date.now();
	const elapsedSec = Math.max(0, Math.round((endedAt - startTime) / 1000));

	// reject obvious false triggers
	if (elapsedSec < 5) {
		WARN("accepted trigger ignored (too short)", elapsedSec);
		resetTimer();
		return;
	}

	const draft: DraftAttempt = {
		attemptId: uuidv4(),
		problemLink,
		title: startedTitle ?? getTitleBestEffort(),
		difficulty: startedDifficulty ?? getDifficultyBestEffort(),
		startedAt: startTime,
		endedAt,
		elapsedSec,
		createdAt: endedAt,
	};

	LOG("accepted -> opening save UI", {
		title: draft.title,
		minutes: fmtMinutes(draft.elapsedSec),
		link: draft.problemLink,
	});

	const res = (await chrome.runtime.sendMessage({
		kind: "OPEN_SAVE_POPUP",
		draft,
	})) as RuntimeResponse;

	// Always reset to avoid loops
	resetTimer();

	if (!res.ok) WARN("OPEN_SAVE_POPUP failed:", res.error);
}

function installInteractionListeners(): void {
	const onAny = (e: Event) => {
		if (!shouldStartFromEvent(e)) return;
		startTimerIfNeeded();
	};

	document.addEventListener("keydown", onAny, { capture: true });
	document.addEventListener("mousedown", onAny, { capture: true });
	document.addEventListener("pointerdown", onAny, { capture: true });
	document.addEventListener("touchstart", onAny, { capture: true });
}

function installAcceptedObserver(): void {
	let lastAccepted = false;

	const obs = new MutationObserver(() => {
		if (!isLeetCodeProblemPage()) return;

		const cur = readSubmissionResultText().toLowerCase();
		const isAcceptedNow = cur.includes("accepted");

		// only fire on false -> true
		if (!lastAccepted && isAcceptedNow) {
			if (canFinalizeNow()) void finalizeAccepted();
			else WARN("accepted suppressed (local cooldown)");
		}

		lastAccepted = isAcceptedNow;
	});

	obs.observe(document.documentElement, {
		subtree: true,
		childList: true,
		characterData: true,
	});

	// initialize state
	const initial = readSubmissionResultText().toLowerCase();
	lastAccepted = initial.includes("accepted");
}

// ---- route change hooks: no polling ----
function hookHistory(): void {
	const origPush = history.pushState;
	const origReplace = history.replaceState;

	const onRouteChange = () => {
		resetTimer();
	};

	history.pushState = function (...args) {
		origPush.apply(this, args as never);
		onRouteChange();
	};

	history.replaceState = function (...args) {
		origReplace.apply(this, args as never);
		onRouteChange();
	};

	window.addEventListener("popstate", onRouteChange);
}

(function main() {
	LOG("content_leetcode loaded", window.location.href);
	hookHistory();
	installInteractionListeners();
	installAcceptedObserver();
})();
