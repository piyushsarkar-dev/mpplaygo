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

	const getScrollParent = (el) => {
		if (!el) return null;
		let current = el.parentElement;
		while (current) {
			// Radix ScrollArea viewport
			if (current.hasAttribute?.("data-radix-scroll-area-viewport")) {
				return current;
			}

			const style = window.getComputedStyle(current);
			const overflowY = style.overflowY;
			const isScrollable =
				(overflowY === "auto" ||
					overflowY === "scroll" ||
					overflowY === "overlay") &&
				current.scrollHeight > current.clientHeight;

			if (isScrollable) return current;
			current = current.parentElement;
		}
		return null;
	};

	useEffect(() => {
		onLoadMoreRef.current = onLoadMore;
	}, [onLoadMore]);

	useEffect(() => {
		if (!enabled) return;
		const node = sentinelRef.current;
		if (!node) return;

		const resolvedRoot = root ?? getScrollParent(node);

		const observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (!entry?.isIntersecting) return;
				onLoadMoreRef.current?.();
			},
			{ root: resolvedRoot, rootMargin, threshold }
		);

		observer.observe(node);
		return () => observer.disconnect();
	}, [enabled, root, rootMargin, threshold]);

	return { sentinelRef };
}
