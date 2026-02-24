// file: tracker/src/content_nefcode_bridge.ts

import type { BridgeMessage, RuntimeResponse } from "./shared/types";

function isFromSameWindow(e: MessageEvent): boolean {
	return e.source === window;
}

function isAllowedOrigin(origin: string): boolean {
	try {
		const u = new URL(origin);
		return u.hostname === "nefariousniru.github.io";
	} catch {
		return false;
	}
}

async function handleBridge(e: MessageEvent): Promise<void> {
	if (!isFromSameWindow(e)) return;
	if (!isAllowedOrigin(e.origin)) return;

	const data = e.data as BridgeMessage | undefined;
	if (!data || typeof data !== "object") return;

	if (data.type === "NEFCODE_SYNC_REQUEST") {
		const since = typeof data.since === "number" ? data.since : undefined;

		const res = (await chrome.runtime.sendMessage({
			kind: "GET_ATTEMPTS",
			since,
		})) as RuntimeResponse;

		if (!res.ok) {
			window.postMessage(
				{
					type: "NEFCODE_SYNC_ERROR",
					message: res.error,
				} satisfies BridgeMessage,
				e.origin,
			);
			return;
		}

		window.postMessage(
			{
				type: "NEFCODE_SYNC_RESPONSE",
				attempts: res.attempts ?? [],
			} satisfies BridgeMessage,
			e.origin,
		);
		return;
	}

	if (data.type === "NEFCODE_SYNC_ACK") {
		const ids = Array.isArray(data.importedAttemptIds)
			? data.importedAttemptIds.filter((x) => typeof x === "string")
			: [];

		if (ids.length === 0) return;
		await chrome.runtime.sendMessage({ kind: "ACK_IMPORTED", attemptIds: ids });
	}
}

window.addEventListener("message", (e) => {
	void handleBridge(e);
});
