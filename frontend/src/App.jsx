import { useEffect, useState } from "react";
import {
  createComment,
  createPost,
  createUser,
  getFeed,
  getPostComments,
  getQuerySchema,
  getUserProfile,
  getUsers,
  runSql,
  runTextToSql,
  toggleLike,
} from "./api";

const showcasePrompts = [
  "most liked posts",
  "most active users",
  "recent posts",
  "comments for post 1",
];

const blankRegistration = {
  username: "",
  display_name: "",
  bio: "",
};

const blankPost = {
  description: "",
  image_url: "",
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

function QueryTable({ result }) {
  if (!result) {
    return <p className="muted-copy">Run analytics from the lounge.</p>;
  }

  return (
    <div className="query-result">
      <div className="query-result__meta">
        <span>{result.title ?? "SQL Result"}</span>
        <span>{result.row_count} rows</span>
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              {result.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, index) => (
              <tr key={`${index}-${JSON.stringify(row)}`}>
                {result.columns.map((column) => (
                  <td key={column}>{String(row[column] ?? "")}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

function Composer({ postForm, setPostForm, onSubmit }) {
  return (
    <section className="app-card">
      <div className="card-header">
        <span className="eyebrow">I. Compose</span>
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
          />
        </label>
        <label>
          Image URL
          <input
            value={postForm.image_url}
            onChange={(event) =>
              setPostForm((current) => ({ ...current, image_url: event.target.value }))
            }
            placeholder="https://..."
            required
          />
        </label>
        <button className="deco-button" type="submit">
          Publish
        </button>
      </form>
    </section>
  );
}

function PostCard({
  post,
  active,
  currentUserId,
  onLike,
  onOpen,
}) {
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
      <div className="frame-image">
        <div className="frame-image__inner">
          <img src={post.image_url} alt={post.description} />
        </div>
      </div>
      <p className="feed-card__body">{post.description}</p>
      <div className="feed-card__stats">
        <span>Likes {post.like_count}</span>
        <span>Comments {post.comment_count}</span>
      </div>
      <div className="feed-card__actions">
        <button className="deco-button deco-button--ghost" onClick={() => onLike(post.id, currentUserId)}>
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
  const [querySchema, setQuerySchema] = useState(null);
  const [queryPrompt, setQueryPrompt] = useState("most liked posts");
  const [sqlText, setSqlText] = useState("SELECT username, display_name FROM users ORDER BY id");
  const [queryResult, setQueryResult] = useState(null);
  const [registration, setRegistration] = useState(blankRegistration);
  const [postForm, setPostForm] = useState(blankPost);
  const [commentBody, setCommentBody] = useState("");

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

  async function openPost(post) {
    const comments = await getPostComments(post.id);
    setSelectedPost(post);
    setSelectedComments(comments);
    await loadProfile(post.username);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const [initialUsers, initialFeed, schema] = await Promise.all([
          refreshUsers(),
          refreshFeed("recent"),
          getQuerySchema(),
        ]);

        setQuerySchema(schema);

        if (initialUsers.length) {
          setCurrentUser(initialUsers[0]);
          await loadProfile(initialUsers[0].username);
          setStatus(`Logged in as @${initialUsers[0].username}`);
        } else {
          setStatus("Create the first account to enter HKUgram.");
        }

        if (initialFeed.length) {
          await openPost(initialFeed[0]);
        }
      } catch (error) {
        setStatus(error.message);
      }
    }

    bootstrap();
  }, []);

  async function handleRegister(event) {
    event.preventDefault();
    try {
      const user = await createUser(registration);
      await refreshUsers();
      setCurrentUser(user);
      setRegistration(blankRegistration);
      await loadProfile(user.username);
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

    try {
      await createPost({
        user_id: currentUser.id,
        description: postForm.description,
        image_url: postForm.image_url,
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
      setStatus("Choose a user to like posts.");
      return;
    }

    try {
      await toggleLike(postId, userId);
      const items = await refreshFeed(sortBy);
      const target = items.find((post) => post.id === postId);
      if (target) {
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
      setStatus("Choose a user and a post first.");
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

  async function handlePromptRun(prompt) {
    try {
      const result = await runTextToSql(prompt);
      setQueryPrompt(prompt);
      setQueryResult(result);
      setStatus(`Analytics updated: ${result.title}`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleSqlRun(event) {
    event.preventDefault();
    try {
      const result = await runSql(sqlText);
      setQueryResult({ ...result, title: "Custom SQL" });
      setStatus("Read-only SQL executed.");
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

      <main className="social-layout">
        <aside className="left-rail">
          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">I. Session</span>
              <h2>Login / Register</h2>
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
            <div className="user-switcher">
              <p className="eyebrow eyebrow--small">Switch User</p>
              <div className="user-switcher__list">
                {users.map((user) => (
                  <button
                    key={user.id}
                    className={`user-pill ${currentUser?.id === user.id ? "user-pill--active" : ""}`}
                    onClick={async () => {
                      setCurrentUser(user);
                      await loadProfile(user.username);
                      setStatus(`Switched to @${user.username}`);
                    }}
                  >
                    @{user.username}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Composer postForm={postForm} setPostForm={setPostForm} onSubmit={handleCreatePost} />
        </aside>

        <section className="feed-column">
          <section className="app-card feed-header-card">
            <div className="card-header card-header--row">
              <div>
                <span className="eyebrow">II. Feed</span>
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
              Every post shows username, caption, image, timestamp, like count, and comment count.
            </p>
          </section>

          <div className="feed-list">
            {feed.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                active={selectedPost?.id === post.id}
                currentUserId={currentUser?.id}
                onLike={handleLike}
                onOpen={openPost}
              />
            ))}
          </div>
        </section>

        <aside className="right-rail">
          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">III. Thread</span>
              <h2>Post Detail</h2>
            </div>
            {selectedPost ? (
              <>
                <div className="thread-meta">
                  <strong>{selectedPost.display_name}</strong>
                  <span>@{selectedPost.username}</span>
                  <time>{formatDate(selectedPost.created_at)}</time>
                </div>
                <p className="thread-body">{selectedPost.description}</p>
                <form className="stack-form" onSubmit={handleComment}>
                  <label>
                    Add Comment
                    <textarea
                      value={commentBody}
                      onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Write into the thread"
                      required
                    />
                  </label>
                  <button className="deco-button" type="submit">
                    Comment
                  </button>
                </form>
                <CommentList comments={selectedComments} />
              </>
            ) : (
              <p className="muted-copy">Select a post to view its thread.</p>
            )}
          </section>

          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">IV. Profile</span>
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

          <section className="app-card">
            <div className="card-header">
              <span className="eyebrow">V. Analytics</span>
              <h2>SQL Lounge</h2>
            </div>
            <div className="prompt-grid">
              {showcasePrompts.map((prompt) => (
                <button
                  key={prompt}
                  className={`prompt-chip ${queryPrompt === prompt ? "prompt-chip--active" : ""}`}
                  onClick={() => handlePromptRun(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form className="stack-form" onSubmit={handleSqlRun}>
              <label>
                Custom SELECT
                <textarea value={sqlText} onChange={(event) => setSqlText(event.target.value)} required />
              </label>
              <button className="deco-button deco-button--ghost" type="submit">
                Execute
              </button>
            </form>
            <QueryTable result={queryResult} />
            {querySchema ? (
              <div className="schema-block">
                <h3>Schema</h3>
                <div className="schema-tags">
                  {Object.entries(querySchema.tables).map(([table, columns]) => (
                    <span key={table} className="schema-tag">
                      {table}: {columns.join(", ")}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </main>
    </div>
  );
}
