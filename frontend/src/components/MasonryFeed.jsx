import { useLayoutEffect, useMemo, useRef } from "react";
import PostCard from "./PostCard";

function getPostKey(post, index) {
  return post.id ?? `${post.username}-${post.created_at}-${index}`;
}

function updateItemSpan(node) {
  const container = node.parentElement;
  if (!container) return;

  const styles = window.getComputedStyle(container);
  const rowHeight = Number.parseFloat(styles.getPropertyValue("grid-auto-rows"));
  const rowGap = Number.parseFloat(styles.getPropertyValue("row-gap"));

  if (!rowHeight) return;

  const height = node.getBoundingClientRect().height;
  const span = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)));
  node.style.gridRowEnd = `span ${span}`;
}

export default function MasonryFeed({
  ariaLabel,
  currentUserId,
  onLike,
  onOpen,
  onProfile,
  posts,
}) {
  const itemRefs = useRef(new Map());
  const frameRef = useRef(0);
  const keys = useMemo(() => posts.map(getPostKey), [posts]);

  useLayoutEffect(() => {
    const nodes = keys
      .map((key) => itemRefs.current.get(key))
      .filter(Boolean);

    if (!nodes.length) return undefined;

    const measureAll = () => {
      nodes.forEach(updateItemSpan);
    };

    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = window.requestAnimationFrame(measureAll);
    };

    scheduleMeasure();

    let resizeObserver;
    if ("ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure();
      });
      nodes.forEach((node) => resizeObserver.observe(node));
    }

    window.addEventListener("resize", scheduleMeasure);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", scheduleMeasure);
      resizeObserver?.disconnect();
    };
  }, [keys]);

  return (
    <section className="feed-waterfall" aria-label={ariaLabel}>
      {posts.map((post, index) => {
        const key = keys[index];
        return (
          <div
            className="feed-waterfall__item"
            key={key}
            ref={(node) => {
              if (node) itemRefs.current.set(key, node);
              else itemRefs.current.delete(key);
            }}
          >
            <PostCard
              currentUserId={currentUserId}
              onLike={onLike}
              onOpen={onOpen}
              onProfile={onProfile}
              post={post}
            />
          </div>
        );
      })}
    </section>
  );
}
