"use client";

import { useState } from "react";

function createRowId() {
	return crypto.randomUUID();
}

function createRowIds(count: number) {
	return Array.from({ length: count }, () => createRowId());
}

export function useStableRowIds(count: number, versionId?: string) {
	const [rowIds, setRowIds] = useState<string[]>(() => createRowIds(count));
	const [prevVersionId, setPrevVersionId] = useState(versionId);

	if (prevVersionId !== versionId) {
		setPrevVersionId(versionId);
		setRowIds(createRowIds(count));
	}

	function appendRowId() {
		setRowIds((current) => [...current, createRowId()]);
	}

	function removeRowId(index: number) {
		setRowIds((current) => current.filter((_, i) => i !== index));
	}

	return { rowIds, appendRowId, removeRowId };
}
