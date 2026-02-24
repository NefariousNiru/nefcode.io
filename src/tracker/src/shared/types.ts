// file: tracker/src/shared/types.ts

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "UNKNOWN";

export type Attempt = {
	readonly attemptId: string;
	readonly problemLink: string;
	readonly title: string;
	readonly difficulty: Difficulty;

	readonly startedAt: number; // epoch ms
	readonly endedAt: number; // epoch ms
	readonly elapsedSec: number;

	readonly notes: string | null;
	readonly createdAt: number; // endedAt
};

export type DraftAttempt = Omit<Attempt, "notes">;

export type RuntimeRequest =
	| { readonly kind: "OPEN_SAVE_POPUP"; readonly draft: DraftAttempt }
	| { readonly kind: "DRAFT_GET"; readonly draftId: string }
	| {
			readonly kind: "DRAFT_SAVE";
			readonly draftId: string;
			readonly notes: string | null;
	  }
	| { readonly kind: "DRAFT_DISCARD"; readonly draftId: string }
	| { readonly kind: "ICON_SET"; readonly active: boolean }
	| { readonly kind: "GET_ATTEMPTS"; readonly since?: number }
	| { readonly kind: "ACK_IMPORTED"; readonly attemptIds: readonly string[] };

export type RuntimeResponse =
	| {
			readonly ok: true;
			readonly draft?: DraftAttempt | null;
			readonly attempts?: readonly Attempt[];
	  }
	| { readonly ok: false; readonly error: string };
