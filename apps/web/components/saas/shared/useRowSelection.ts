"use client";

import { useCallback, useMemo, useState } from "react";

export function useRowSelection(pageIds: string[]) {
	const [selected, setSelected] = useState<Set<string>>(new Set());

	const selectedOnPage = useMemo(
		() => pageIds.filter((id) => selected.has(id)),
		[pageIds, selected],
	);

	const allPageSelected =
		pageIds.length > 0 && selectedOnPage.length === pageIds.length;
	const somePageSelected =
		selectedOnPage.length > 0 && selectedOnPage.length < pageIds.length;

	const toggle = useCallback((id: string) => {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	const togglePage = useCallback(
		(checked: boolean) => {
			setSelected((prev) => {
				const next = new Set(prev);
				for (const id of pageIds) {
					if (checked) {
						next.add(id);
					} else {
						next.delete(id);
					}
				}
				return next;
			});
		},
		[pageIds],
	);

	const clear = useCallback(() => {
		setSelected(new Set());
	}, []);

	const selectedIds = useMemo(() => Array.from(selected), [selected]);

	return {
		selected,
		selectedIds,
		selectedCount: selected.size,
		isSelected: (id: string) => selected.has(id),
		toggle,
		togglePage,
		clear,
		allPageSelected,
		somePageSelected,
	};
}
