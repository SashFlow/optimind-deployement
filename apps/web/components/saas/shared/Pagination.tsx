import { Button } from "@repo/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Default page size for all SaaS data tables. */
export const PAGE_SIZE = 10;

export type PaginationProps = {
	className?: string;
	totalItems: number;
	itemsPerPage?: number;
	currentPage: number;
	onChangeCurrentPage: (page: number) => void;
};

export function useClientPagination<T>(
	items: T[],
	itemsPerPage: number = PAGE_SIZE,
) {
	const [currentPage, setCurrentPage] = useState(1);
	const pageCount = Math.max(1, Math.ceil(items.length / itemsPerPage));

	useEffect(() => {
		if (currentPage > pageCount) {
			setCurrentPage(pageCount);
		}
	}, [currentPage, pageCount]);

	const pageItems = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return items.slice(start, start + itemsPerPage);
	}, [items, currentPage, itemsPerPage]);

	return {
		currentPage,
		setCurrentPage,
		pageItems,
		pageCount,
		totalItems: items.length,
		itemsPerPage,
	};
}

/** Progressively reveals client-side items as the sentinel scrolls into view. */
export function useClientInfiniteScroll<T>(
	items: T[],
	itemsPerPage: number = PAGE_SIZE,
) {
	const [visibleCount, setVisibleCount] = useState(itemsPerPage);
	const sentinelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		setVisibleCount(itemsPerPage);
	}, [items, itemsPerPage]);

	const visibleItems = useMemo(
		() => items.slice(0, visibleCount),
		[items, visibleCount],
	);
	const hasMore = visibleCount < items.length;

	const loadMore = useCallback(() => {
		setVisibleCount((count) =>
			Math.min(count + itemsPerPage, items.length),
		);
	}, [items.length, itemsPerPage]);

	useEffect(() => {
		const node = sentinelRef.current;
		if (!node || !hasMore) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					loadMore();
				}
			},
			{ rootMargin: "200px" },
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [hasMore, loadMore, visibleCount]);

	return {
		visibleItems,
		hasMore,
		sentinelRef,
		totalItems: items.length,
	};
}

const Pagination = ({
	currentPage,
	totalItems,
	itemsPerPage = PAGE_SIZE,
	className,
	onChangeCurrentPage,
}: PaginationProps) => {
	const numberOfPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
	const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
	const end = Math.min(currentPage * itemsPerPage, totalItems);

	return (
		<div className={className}>
			<div className="flex items-center justify-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					disabled={currentPage <= 1 || totalItems === 0}
					onClick={() => onChangeCurrentPage(currentPage - 1)}
				>
					<ChevronLeftIcon />
				</Button>
				<span className="text-muted-foreground text-sm">
					{start} - {end} of {totalItems}
				</span>
				<Button
					variant="ghost"
					size="icon"
					disabled={currentPage >= numberOfPages || totalItems === 0}
					onClick={() => onChangeCurrentPage(currentPage + 1)}
				>
					<ChevronRightIcon />
				</Button>
			</div>
		</div>
	);
};
Pagination.displayName = "Pagination";

export { Pagination };
