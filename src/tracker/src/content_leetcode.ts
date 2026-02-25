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

// Keep a long-lived port so background gets onDisconnect when tab closes.
const port = chrome.runtime.connect({ name: "nefcode-tracker" });
void port; // just to make it explicit we intentionally keep it alive

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

function setIcon(active: boolean): void {
	void chrome.runtime.sendMessage({ kind: "ICON_SET", active });
}

// --------------------
// Start only on typing in editor
// --------------------

function isModifierOnlyKey(e: KeyboardEvent): boolean {
	return (
		e.key === "Shift" ||
		e.key === "Alt" ||
		e.key === "Meta" ||
		e.key === "Control"
	);
}

function isEditorTarget(target: EventTarget | null): boolean {
	if (!(target instanceof Element)) return false;

	// Monaco (LeetCode default)
	if (target.closest(".monaco-editor")) return true;

	// Monaco actual input
	if (
		target instanceof HTMLTextAreaElement &&
		target.classList.contains("inputarea")
	)
		return true;

	// Defensive fallbacks
	return !!target.closest(
		[
			".monaco-editor",
			".CodeMirror",
			".cm-editor",
			'[data-e2e-locator="editor"]',
			'[data-testid="code-editor"]',
		].join(","),
	);
}

function shouldStartFromKeydown(e: KeyboardEvent): boolean {
	if (!isLeetCodeProblemPage()) return false;
	if (isModifierOnlyKey(e)) return false;
	if (e.metaKey || e.ctrlKey || e.altKey) return false;

	const allowedSpecial = new Set(["Enter", "Backspace", "Tab", "Delete"]);
	if (e.key.length > 1 && !allowedSpecial.has(e.key)) return false;

	return isEditorTarget(e.target);
}

// --------------------
// In-memory timer
// --------------------

let startTime: number | null = null;
let startedForLink: string | null = null;
let startedTitle: string | null = null;
let startedDifficulty: Difficulty | null = null;

let finalizeGuardKey: string | null = null;

// local cooldown (avoid spamming bg)
let lastFinalizeAt = 0;
const FINALIZE_COOLDOWN_MS = 10_000;

function canFinalizeNow(): boolean {
	const now = Date.now();
	if (now - lastFinalizeAt < FINALIZE_COOLDOWN_MS) return false;
	lastFinalizeAt = now;
	return true;
}

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
	if (startTime === null) {
		// still make sure icon isn't stuck if something got out-of-sync
		setIcon(false);
		return;
	}

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

	resetTimer();

	if (!res.ok) WARN("OPEN_SAVE_POPUP failed:", res.error);
}

// --------------------
// Hooks
// --------------------

function installEditorTypingListener(): void {
	document.addEventListener(
		"keydown",
		(e) => {
			if (!(e instanceof KeyboardEvent)) return;
			if (!shouldStartFromKeydown(e)) return;
			startTimerIfNeeded();
		},
		{ capture: true },
	);
}

function installStopHooks(): void {
	// If tab becomes hidden, stop and clear icon
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) resetTimer();
	});

	// Page lifecycle: best-effort stop
	window.addEventListener("pagehide", () => resetTimer(), { capture: true });
	window.addEventListener("beforeunload", () => resetTimer(), {
		capture: true,
	});
}

function installAcceptedObserver(): void {
	let lastAccepted = false;

	const obs = new MutationObserver(() => {
		if (!isLeetCodeProblemPage()) {
			if (startTime !== null) resetTimer();
			return;
		}

		const cur = readSubmissionResultText().toLowerCase();
		const isAcceptedNow = cur.includes("accepted");

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

	const initial = readSubmissionResultText().toLowerCase();
	lastAccepted = initial.includes("accepted");
}

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

	// Ensure we don't start "active" on load
	setIcon(false);

	hookHistory();
	installStopHooks();
	installEditorTypingListener();
	installAcceptedObserver();
})();
