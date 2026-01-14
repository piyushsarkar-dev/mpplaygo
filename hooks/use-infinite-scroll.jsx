"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onLoadMore` when the sentinel element becomes visible.
 *
 * Typical usage:
 *   const { sentinelRef } = useInfiniteScroll({
 *     enabled: hasMore && !loading,
 *     onLoadMore: loadMore,
 *   })
 */
export function useInfiniteScroll({
	enabled = true,
	onLoadMore,
	root = null,
	rootMargin = "400px 0px",
	threshold = 0,
} = {}) {
	const sentinelRef = useRef(null);
	const onLoadMoreRef = useRef(onLoadMore);

	useEffect(() => {
		onLoadMoreRef.current = onLoadMore;
	}, [onLoadMore]);

	useEffect(() => {
		if (!enabled) return;
		const node = sentinelRef.current;
		if (!node) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting) return;
				onLoadMoreRef.current?.();
			},
			{ root, rootMargin, threshold }
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [enabled, root, rootMargin, threshold]);

	return { sentinelRef };
}
