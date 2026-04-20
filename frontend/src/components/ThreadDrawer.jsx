import { memo, useEffect, useState } from "react";
import Avatar from "./Avatar";
import CommentList from "./CommentList";
import { formatDate } from "../lib/format";
import { icons } from "../lib/icons";

const ThreadDrawer = memo(function ThreadDrawer({ currentUser, post, comments, onComment, onClose, onLike, onProfile }) {
  const [draft, setDraft] = useState("");
  const isLiked = Boolean(post?.liked_by_viewer);

  useEffect(() => {
    setDraft("");
  }, [post?.id]);

  if (!post) return null;
  return (
    <div className="thread-overlay" onClick={onClose}>
      <aside className="thread-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="thread-drawer__header">
          <div>
            <span className="eyebrow">Post Detail</span>
            <h2>Open Thread</h2>
          </div>
          <button className="ghost-text-button" onClick={onClose} type="button">Close</button>
        </div>
        <button className="author-row author-row--thread" onClick={() => onProfile(post.username)} type="button">
          <Avatar username={post.username} size="md" />
          <div className="author-row__meta">
            <strong>{post.display_name}</strong>
            <span>@{post.username}</span>
          </div>
          <time>{formatDate(post.created_at)}</time>
        </button>
        <div className="thread-image-wrap">
          <img src={post.image_url} alt={post.description} />
        </div>
        <div className="thread-post-meta">
          <span className="post-chip">{post.category}</span>
          <div className="thread-post-stats"><span>{post.like_count} likes</span><span>{post.comment_count} comments</span></div>
        </div>
        <div className="thread-post-actions">
          <button
            aria-label={isLiked ? "Unlike post" : "Like post"}
            aria-pressed={isLiked}
            className={`icon-action thread-like-button ${isLiked ? "icon-action--active" : ""}`}
            disabled={!currentUser}
            onClick={() => onLike(post.id, currentUser?.id)}
            type="button"
          >
            {isLiked ? icons.heartFilled : icons.heart}
            <span>{isLiked ? "Liked" : "Like"}</span>
          </button>
          {!currentUser ? <span className="thread-post-hint">Log in to like posts.</span> : null}
        </div>
        <p className="thread-body">{post.description}</p>
        <form
          className="stack-form thread-form"
          onSubmit={(event) => {
            event.preventDefault();
            onComment(draft, () => setDraft(""));
          }}
        >
          <label>
            Add Comment
            <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={currentUser ? "Write something thoughtful..." : "Log in to comment"} disabled={!currentUser} required />
          </label>
          <button className="primary-pill-button" type="submit" disabled={!currentUser}>Post Comment</button>
        </form>
        <CommentList comments={comments} onProfile={onProfile} />
      </aside>
    </div>
  );
});

export default ThreadDrawer;
