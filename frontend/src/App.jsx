import { useEffect, useState } from "react";
import {
  createComment,
  createUploadedPost,
  createUser,
  getFeed,
  getPostComments,
  getUserProfile,
  getUsers,
  loginUser,
  toggleLike,
} from "./api";

const SESSION_KEY = "hkugram_username";

const blankRegistration = {
  username: "",
  display_name: "",
  bio: "",
};

const blankLogin = {
  username: "",
};

const blankPost = {
  description: "",
  imageFile: null,
};

function formatDate(value) {
  return new Intl.DateTimeFormat("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DiamondBadge({ text }) {
  return (
    <div className="diamond-badge">
      <span>{text}</span>
    </div>
  );
}

function CommentList({ comments }) {
  if (!comments.length) {
    return <p className="muted-copy">No comments yet.</p>;
  }

  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <article className="comment-item" key={comment.id}>
          <div className="comment-item__head">
            <strong>{comment.display_name}</strong>
            <span>@{comment.username}</span>
          </div>
          <p>{comment.body}</p>
          <time>{formatDate(comment.created_at)}</time>
        </article>
      ))}
    </div>
  );
}

function Composer({ disabled, postForm, setPostForm, onSubmit }) {
  return (
    <section className="app-card">
      <div className="card-header">
        <span className="eyebrow">II. Compose</span>
        <h2>New Post</h2>
      </div>
      <form className="stack-form" onSubmit={onSubmit}>
        <label>
          Caption
          <textarea
            value={postForm.description}
            onChange={(event) =>
              setPostForm((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Tell the feed what happened."
            required
            disabled={disabled}
          />
        </label>
        <label>
          Upload Image
          <input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setPostForm((current) => ({
                ...current,
                imageFile: event.target.files?.[0] ?? null,
              }))
            }
            required
            disabled={disabled}
          />
        </label>
        {postForm.imageFile ? <p className="muted-copy">Selected: {postForm.imageFile.name}</p> : null}
        <button className="deco-button" type="submit" disabled={disabled}>
          Publish
        </button>
      </form>
      {disabled ? <p className="muted-copy">Log in first to publish a post.</p> : null}
    </section>
  );
}

function PostPreviewComments({ comments, onOpenThread, commentCount }) {
  if (!comments?.length) {
    return (
      <button className="inline-thread-link" onClick={onOpenThread}>
        No comments yet. Open thread
      </button>
    );
  }

  return (
    <div className="preview-comments">
      {comments.map((comment) => (
        <button className="preview-comment" key={comment.id} onClick={onOpenThread}>
          <strong>@{comment.username}</strong>
          <span>{comment.body}</span>
        </button>
      ))}
      {commentCount > comments.length ? (
        <button className="inline-thread-link" onClick={onOpenThread}>
          View all {commentCount} comments
        </button>
      ) : null}
    </div>
  );
}

function ThreadDrawer({
  currentUser,
  post,
  comments,
  commentBody,
  setCommentBody,
  onComment,
  onClose,
}) {
  if (!post) {
    return null;
  }

  return (
    <div className="thread-overlay" onClick={onClose}>
      <aside className="thread-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="thread-drawer__header">
          <div>
            <span className="eyebrow">IV. Thread</span>
            <h2>Open Thread</h2>
          </div>
          <button className="deco-button deco-button--ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="thread-meta">
          <strong>{post.display_name}</strong>
          <span>@{post.username}</span>
          <time>{formatDate(post.created_at)}</time>
        </div>
        <div className="frame-image thread-image">
          <div className="frame-image__inner">
            <img src={post.image_url} alt={post.description} />
          </div>
        </div>
        <p className="thread-body">{post.description}</p>
        <div className="feed-card__stats">
          <span>Likes {post.like_count}</span>
          <span>Comments {post.comment_count}</span>
        </div>
        <form className="stack-form" onSubmit={onComment}>
          <label>
            Add Comment
            <textarea
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder={currentUser ? "Write into the thread" : "Log in to comment"}
              required
              disabled={!currentUser}
            />
          </label>
          <button className="deco-button" type="submit" disabled={!currentUser}>
            Comment
          </button>
        </form>
        {!currentUser ? <p className="muted-copy">You must log in to comment.</p> : null}
        <CommentList comments={comments} />
      </aside>
    </div>
  );
}

function PostCard({ post, active, currentUserId, onLike, onOpen }) {
  return (
    <article className={`app-card feed-card ${active ? "feed-card--active" : ""}`}>
      <div className="corner corner--tl" aria-hidden="true" />
      <div className="corner corner--br" aria-hidden="true" />
      <div className="feed-card__head">
        <DiamondBadge text={post.username.slice(0, 2).toUpperCase()} />
        <div className="feed-card__user">
          <h3>{post.display_name}</h3>
          <p>@{post.username}</p>
        </div>
        <time>{formatDate(post.created_at)}</time>
      </div>
      <div className="feed-card__mediaRow">
        <div className="frame-image frame-image--compact">
          <div className="frame-image__inner">
            <img src={post.image_url} alt={post.description} />
          </div>
        </div>
        <div className="feed-card__content">
          <p className="feed-card__body">{post.description}</p>
          <PostPreviewComments
            comments={post.recent_comments}
            commentCount={post.comment_count}
            onOpenThread={() => onOpen(post)}
          />
        </div>
      </div>
      <div className="feed-card__stats">
        <span>Likes {post.like_count}</span>
        <span>Comments {post.comment_count}</span>
      </div>
      <div className="feed-card__actions">
        <button
          className="deco-button deco-button--ghost"
          onClick={() => onLike(post.id, currentUserId)}
          disabled={!currentUserId}
        >
          Like / Unlike
        </button>
        <button className="deco-button" onClick={() => onOpen(post)}>
          Open Thread
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const [feed, setFeed] = useState([]);
  const [users, setUsers] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedComments, setSelectedComments] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [status, setStatus] = useState("Loading HKUgram...");
  const [registration, setRegistration] = useState(blankRegistration);
  const [loginForm, setLoginForm] = useState(blankLogin);
  const [postForm, setPostForm] = useState(blankPost);
  const [commentBody, setCommentBody] = useState("");
  const [isThreadOpen, setIsThreadOpen] = useState(false);

  async function refreshUsers() {
    const nextUsers = await getUsers();
    setUsers(nextUsers);
    return nextUsers;
  }

  async function refreshFeed(nextSort = sortBy) {
    const items = await getFeed(nextSort);
    setFeed(items);
    if (selectedPost) {
      const updated = items.find((post) => post.id === selectedPost.id);
      if (updated) {
        setSelectedPost(updated);
      }
    }
    return items;
  }

  async function loadProfile(username) {
    const profile = await getUserProfile(username);
    setSelectedProfile(profile);
    return profile;
  }

  async function setLoggedInUser(user) {
    setCurrentUser(user);
    setLoginForm({ username: user.username });
    localStorage.setItem(SESSION_KEY, user.username);
    await loadProfile(user.username);
  }

  function logout() {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setStatus("Logged out.");
  }

  async function openPost(post) {
    const comments = await getPostComments(post.id);
    setSelectedPost(post);
    setSelectedComments(comments);
    setIsThreadOpen(true);
    await loadProfile(post.username);
    setStatus(`Opened thread for @${post.username}`);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const [initialUsers, initialFeed] = await Promise.all([
          refreshUsers(),
          refreshFeed("recent"),
        ]);

        const savedUsername = localStorage.getItem(SESSION_KEY);
        if (savedUsername) {
          try {
            const user = await loginUser(savedUsername);
            await setLoggedInUser(user);
            setStatus(`Logged in as @${user.username}`);
          } catch {
            localStorage.removeItem(SESSION_KEY);
          }
        } else {
          setStatus("Log in or register to interact with HKUgram.");
        }

        if (initialUsers.length && !savedUsername) {
          setLoginForm({ username: initialUsers[0].username });
        }

        if (initialFeed.length) {
          setSelectedPost(initialFeed[0]);
        }
      } catch (error) {
        setStatus(error.message);
      }
    }

    bootstrap();
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      const user = await loginUser(loginForm.username);
      await setLoggedInUser(user);
      setStatus(`Logged in as @${user.username}`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    try {
      const user = await createUser(registration);
      await refreshUsers();
      await setLoggedInUser(user);
      setRegistration(blankRegistration);
      setStatus(`Account created for @${user.username}`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    if (!currentUser) {
      setStatus("Log in before posting.");
      return;
    }
    if (!postForm.imageFile) {
      setStatus("Select an image before publishing.");
      return;
    }

    try {
      await createUploadedPost({
        userId: currentUser.id,
        description: postForm.description,
        imageFile: postForm.imageFile,
      });
      setPostForm(blankPost);
      const items = await refreshFeed(sortBy);
      await refreshUsers();
      await loadProfile(currentUser.username);
      if (items.length) {
        await openPost(items[0]);
      }
      setStatus("Post published.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleLike(postId, userId) {
    if (!userId) {
      setStatus("Log in before liking posts.");
      return;
    }

    try {
      await toggleLike(postId, userId);
      const items = await refreshFeed(sortBy);
      const target = items.find((post) => post.id === postId);
      if (target && isThreadOpen) {
        await openPost(target);
      }
      if (selectedProfile) {
        await loadProfile(selectedProfile.user.username);
      }
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleComment(event) {
    event.preventDefault();
    if (!currentUser || !selectedPost) {
      setStatus("Log in and choose a post first.");
      return;
    }

    try {
      await createComment(selectedPost.id, {
        user_id: currentUser.id,
        body: commentBody,
      });
      setCommentBody("");
      const items = await refreshFeed(sortBy);
      const target = items.find((post) => post.id === selectedPost.id) ?? selectedPost;
      await openPost(target);
      setStatus("Comment published.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <div className="social-app-shell">
      <div className="background-pattern" aria-hidden="true" />
      <header className="app-topbar">
        <div>
          <p className="eyebrow">HKUgram</p>
          <h1>Social Salon</h1>
        </div>
        <div className="topbar-status">
          <span>{currentUser ? `Logged in as @${currentUser.username}` : "No active session"}</span>
          <span>{status}</span>
        </div>
      </header>

      <main className="social-layout social-layout--two-column">
        <aside className="left-rail">
          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">I. Session</span>
              <h2>Login</h2>
            </div>
            <form className="stack-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  value={loginForm.username}
                  onChange={(event) => setLoginForm({ username: event.target.value })}
                  placeholder="enter your username"
                  required
                />
              </label>
              <button className="deco-button" type="submit">
                Log In
              </button>
            </form>
            {currentUser ? (
              <button className="deco-button deco-button--ghost" onClick={logout}>
                Log Out
              </button>
            ) : null}
            <div className="user-switcher">
              <p className="eyebrow eyebrow--small">Existing Accounts</p>
              <div className="user-switcher__list">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className="user-pill"
                    onClick={() => setLoginForm({ username: user.username })}
                  >
                    @{user.username}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">II. Register</span>
              <h2>Create Account</h2>
            </div>
            <form className="stack-form" onSubmit={handleRegister}>
              <label>
                Username
                <input
                  value={registration.username}
                  onChange={(event) =>
                    setRegistration((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="unique username"
                  required
                />
              </label>
              <label>
                Display Name
                <input
                  value={registration.display_name}
                  onChange={(event) =>
                    setRegistration((current) => ({ ...current, display_name: event.target.value }))
                  }
                  placeholder="how others see you"
                  required
                />
              </label>
              <label>
                Bio
                <input
                  value={registration.bio}
                  onChange={(event) =>
                    setRegistration((current) => ({ ...current, bio: event.target.value }))
                  }
                  placeholder="short introduction"
                />
              </label>
              <button className="deco-button" type="submit">
                Create Account
              </button>
            </form>
          </section>

          <Composer
            disabled={!currentUser}
            postForm={postForm}
            setPostForm={setPostForm}
            onSubmit={handleCreatePost}
          />

          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">V. Profile</span>
              <h2>User History</h2>
            </div>
            {selectedProfile ? (
              <>
                <div className="profile-head">
                  <DiamondBadge text={selectedProfile.user.username.slice(0, 2).toUpperCase()} />
                  <div>
                    <h3>{selectedProfile.user.display_name}</h3>
                    <p>@{selectedProfile.user.username}</p>
                    <p className="muted-copy">{selectedProfile.user.bio || "No bio yet."}</p>
                  </div>
                </div>
                <div className="profile-stats">
                  <span>Posts {selectedProfile.stats.post_count}</span>
                  <span>Likes {selectedProfile.stats.total_likes_received}</span>
                  <span>Comments {selectedProfile.stats.total_comments_received}</span>
                </div>
                <div className="history-list">
                  {selectedProfile.recent_posts.map((post) => (
                    <button key={post.id} className="history-item" onClick={() => openPost(post)}>
                      <strong>{formatDate(post.created_at)}</strong>
                      <span>{post.description}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted-copy">Pick a user or post to inspect profile history.</p>
            )}
          </section>
        </aside>

        <section className="feed-column">
          <section className="app-card feed-header-card">
            <div className="card-header card-header--row">
              <div>
                <span className="eyebrow">III. Feed</span>
                <h2>Public Timeline</h2>
              </div>
              <div className="feed-toolbar">
                <button
                  className={`deco-button ${sortBy === "recent" ? "" : "deco-button--ghost"}`}
                  onClick={async () => {
                    setSortBy("recent");
                    await refreshFeed("recent");
                  }}
                >
                  Recent
                </button>
                <button
                  className={`deco-button ${sortBy === "popular" ? "" : "deco-button--ghost"}`}
                  onClick={async () => {
                    setSortBy("popular");
                    await refreshFeed("popular");
                  }}
                >
                  Popular
                </button>
              </div>
            </div>
            <p className="muted-copy">
              Recent should surface the newest post first. Popular should surface the most-liked post first.
            </p>
          </section>

          <div className="feed-list">
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                active={selectedPost?.id === post.id && isThreadOpen}
                currentUserId={currentUser?.id}
                onLike={handleLike}
                onOpen={openPost}
              />
            ))}
          </div>
        </section>
      </main>

      <ThreadDrawer
        currentUser={currentUser}
        post={isThreadOpen ? selectedPost : null}
        comments={selectedComments}
        commentBody={commentBody}
        setCommentBody={setCommentBody}
        onComment={handleComment}
        onClose={() => setIsThreadOpen(false)}
      />
    </div>
  );
}
