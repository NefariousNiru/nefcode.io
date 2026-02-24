// file: src/components/ui/useProblemNoteModal.ts

import { useCallback, useState } from "react";
import type { Difficulty } from "../domain/types.ts";
import type { ProblemProgress } from "../storage/db.ts";

export type NoteModalItem = {
	readonly link: string;
	readonly title: string;
	readonly difficulty: Difficulty;
	readonly progress: ProblemProgress | undefined;
};

export type NoteModalState =
	| { readonly open: false; readonly item: null }
	| { readonly open: true; readonly item: NoteModalItem };

export type UseProblemNoteModal = {
	readonly state: NoteModalState;
	readonly open: (item: NoteModalItem) => void;
	readonly close: () => void;
};

export function useProblemNoteModal(): UseProblemNoteModal {
	const [state, setState] = useState<NoteModalState>({
		open: false,
		item: null,
	});

	const open = useCallback((item: NoteModalItem) => {
		setState({ open: true, item });
	}, []);

	const close = useCallback(() => {
		setState({ open: false, item: null });
	}, []);

	return { state, open, close };
}
