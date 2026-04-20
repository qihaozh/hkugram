import { useCallback, useEffect, useRef, useState } from "react";
import { getFeed } from "../api";

const DEFAULT_FEED_PAGE_SIZE = 9;

export function useFeedController(initialSort = "recent", initialCategory = "All", viewerUserId = null) {
  const [feed, setFeed] = useState([]);
  const [sortBy, setSortBy] = useState(initialSort);
  const [category, setCategory] = useState(initialCategory);
  const [feedError, setFeedError] = useState("");
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [isFeedLoadingMore, setIsFeedLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const activeFeedRequestRef = useRef(0);
  const sortByRef = useRef(initialSort);
  const categoryRef = useRef(initialCategory);
  const feedRef = useRef([]);
  const visibleFeedCountRef = useRef(DEFAULT_FEED_PAGE_SIZE);
  const viewerUserIdRef = useRef(viewerUserId);
  const previousViewerUserIdRef = useRef(viewerUserId);

  useEffect(() => {
    sortByRef.current = sortBy;
  }, [sortBy]);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    feedRef.current = feed;
  }, [feed]);

  useEffect(() => {
    viewerUserIdRef.current = viewerUserId;
  }, [viewerUserId]);

  const refreshFeed = useCallback(async ({
    nextSort = sortByRef.current,
    nextCategory = categoryRef.current,
    limit = visibleFeedCountRef.current,
    append = false,
    viewerUserId: nextViewerUserId = viewerUserIdRef.current,
  } = {}) => {
    const requestId = activeFeedRequestRef.current + 1;
    activeFeedRequestRef.current = requestId;
    if (append) setIsFeedLoadingMore(true);
    else setIsFeedLoading(true);
    setFeedError("");

    try {
      const nextOffset = append ? feedRef.current.length : 0;
      const items = await getFeed(nextSort, nextCategory, {
        limit,
        offset: nextOffset,
        viewerUserId: nextViewerUserId,
      });
      if (activeFeedRequestRef.current === requestId) {
        setFeed((current) => (append ? [...current, ...items] : items));
        setHasMoreFeed(items.length === limit);
      }
      return append ? [...feedRef.current, ...items] : items;
    } catch (error) {
      if (activeFeedRequestRef.current === requestId) {
        if (!append) setFeed([]);
        setFeedError(error.message);
      }
      throw error;
    } finally {
      if (activeFeedRequestRef.current === requestId) {
        if (append) setIsFeedLoadingMore(false);
        else setIsFeedLoading(false);
      }
    }
  }, []);

  const resetFeed = useCallback(async (nextSort, nextCategory) => {
    visibleFeedCountRef.current = DEFAULT_FEED_PAGE_SIZE;
    if (typeof nextSort === "string") {
      setSortBy(nextSort);
      sortByRef.current = nextSort;
    }
    if (typeof nextCategory === "string") {
      setCategory(nextCategory);
      categoryRef.current = nextCategory;
    }
    return refreshFeed({
      nextSort: nextSort ?? sortByRef.current,
      nextCategory: nextCategory ?? categoryRef.current,
      limit: DEFAULT_FEED_PAGE_SIZE,
      append: false,
    });
  }, [refreshFeed]);

  const loadMoreFeed = useCallback(async () => {
    if (isFeedLoading || isFeedLoadingMore || !hasMoreFeed) return feedRef.current;
    return refreshFeed({
      nextSort: sortByRef.current,
      nextCategory: categoryRef.current,
      limit: DEFAULT_FEED_PAGE_SIZE,
      append: true,
    });
  }, [hasMoreFeed, isFeedLoading, isFeedLoadingMore, refreshFeed]);

  const syncVisibleFeedCount = useCallback((nextCount) => {
    visibleFeedCountRef.current = Math.max(DEFAULT_FEED_PAGE_SIZE, nextCount);
  }, []);

  const patchFeedPost = useCallback((postId, updater) => {
    setFeed((current) => {
      let hasChanges = false;
      const next = current.map((post) => {
        if (post.id !== postId) return post;
        hasChanges = true;
        return updater(post);
      });
      if (hasChanges) {
        feedRef.current = next;
      }
      return hasChanges ? next : current;
    });
  }, []);

  useEffect(() => {
    const previousViewerUserId = previousViewerUserIdRef.current ?? null;
    const nextViewerUserId = viewerUserId ?? null;

    if (previousViewerUserId === nextViewerUserId) return;

    previousViewerUserIdRef.current = nextViewerUserId;
    refreshFeed({
      nextSort: sortByRef.current,
      nextCategory: categoryRef.current,
      limit: visibleFeedCountRef.current,
      append: false,
      viewerUserId: nextViewerUserId || undefined,
    }).catch(() => {});
  }, [refreshFeed, viewerUserId]);

  return {
    category,
    feed,
    feedError,
    hasMoreFeed,
    isFeedLoading,
    isFeedLoadingMore,
    loadMoreFeed,
    patchFeedPost,
    refreshFeed,
    resetFeed,
    sortBy,
    syncVisibleFeedCount,
  };
}
