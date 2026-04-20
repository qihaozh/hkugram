import { memo } from "react";
import Avatar from "./Avatar";
import { formatCompactDate } from "../lib/format";
import { icons } from "../lib/icons";

function getMediaShape(post) {
  if (!post.image_width || !post.image_height) return "square";
  const ratio = post.image_width / post.image_height;
  if (ratio >= 1.25) return "landscape";
  if (ratio <= 0.82) return "portrait";
  return "square";
}

const PostCard = memo(function PostCard({ post, currentUserId, onLike, onOpen, onProfile }) {
  const mediaShape = getMediaShape(post);
  const isLiked = Boolean(post.liked_by_viewer);

  return (
    <article className={`post-tile post-tile--${mediaShape}`}>
      <button className={`post-tile__media post-tile__media--${mediaShape}`} onClick={() => onOpen(post)} type="button">
        <img
          src={post.image_url}
          alt={post.description}
          loading="lazy"
          decoding="async"
        />
        <span className="post-chip post-chip--overlay">{post.category}</span>
      </button>
      <div className="post-tile__body">
        <button className="author-row" onClick={() => onProfile(post.username)} type="button">
          <Avatar username={post.username} size="xs" />
          <div className="author-row__meta">
            <strong>{post.display_name}</strong>
            <span>@{post.username}</span>
          </div>
          <time>{formatCompactDate(post.created_at)}</time>
        </button>
        <button className="post-tile__title" onClick={() => onOpen(post)} type="button">{post.description}</button>
        {post.recent_comments.length ? (
          <div className="comment-preview-stack">
            {post.recent_comments.map((comment) => (
              <button className="comment-preview-line" key={comment.id} onClick={() => onOpen(post)} type="button">
                <strong>@{comment.username}</strong>
                <span>{comment.body}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="post-tile__actions">
          <button
            aria-label={isLiked ? "Unlike post" : "Like post"}
            aria-pressed={isLiked}
            className={`icon-action ${isLiked ? "icon-action--active" : ""}`}
            onClick={() => onLike(post.id, currentUserId, {
              currentLiked: isLiked,
              currentLikeCount: post.like_count,
              postOwnerUsername: post.username,
            })}
            disabled={!currentUserId}
            type="button"
          >
            {isLiked ? icons.heartFilled : icons.heart}
            <span>{post.like_count}</span>
          </button>
          <button className="icon-action" onClick={() => onOpen(post)} type="button">{icons.comment}<span>{post.comment_count}</span></button>
        </div>
      </div>
    </article>
  );
});

export default PostCard;
