import { useEffect, useState } from "react";
import {
  createComment,
  createUploadedPost,
  createUser,
  getAnalyticsOverview,
  getFeed,
  getPostComments,
  getUserHistory,
  getUserProfile,
  getUsers,
  loginUser,
  recordPostView,
  toggleLike,
  updateUser,
} from "./api";

const SESSION_KEY = "hkugram_username";
const CATEGORIES = ["All", "Photography", "Cafe", "Inspiration", "Nightlife", "Campus", "Fashion", "Travel"];
const NAV_ITEMS = [
  { id: "home", label: "Discover" },
  { id: "create", label: "Create" },
  { id: "profile", label: "Profile" },
  { id: "history", label: "History" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

const blankRegistration = { username: "", password: "", display_name: "", bio: "" };
const blankLogin = { username: "", password: "" };
const blankPost = { category: "Inspiration", description: "", imageFile: null };
const blankSettings = { display_name: "", bio: "", password: "" };

const icons = {
  home: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="m14.8 9.2-2.4 5.6-5.6 2.4 2.4-5.6 5.6-2.4Z" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>,
  create: <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  profile: <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  history: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  analytics: <svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-8M4 19h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>,
  settings: <svg viewBox="0 0 24 24"><path d="m12 3 1.7 2.3 2.8.4.4 2.8L19 10l-1.1 2 1.1 2-2.1 1.5-.4 2.8-2.8.4L12 21l-1.7-2.3-2.8-.4-.4-2.8L5 14l1.1-2L5 10l2.1-1.5.4-2.8 2.8-.4L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>,
  heart: <svg viewBox="0 0 24 24"><path d="M12 20.5 4.7 13.6a4.9 4.9 0 0 1 6.9-7l.4.4.4-.4a4.9 4.9 0 0 1 6.9 7L12 20.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  comment: <svg viewBox="0 0 24 24"><path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

function formatDate(value) {
  return new Intl.DateTimeFormat("en-HK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatCompactDate(value) {
  return new Intl.DateTimeFormat("en-HK", { month: "short", day: "numeric" }).format(new Date(value));
}

function demoPassword(username) {
  return username === "sam" ? "sam123456" : `${username}123`;
}

function Avatar({ username, size = "md" }) {
  return <div className={`avatar-badge avatar-badge--${size}`}><span>{username.slice(0, 2).toUpperCase()}</span></div>;
}

function TopNav({ currentView, onChange, currentUser, onProfile, onLogout }) {
  return (
    <header className="app-topbar">
      <div className="brand-block">
        <p className="eyebrow">HKUgram</p>
        <h1>Social Salon</h1>
      </div>
      <nav className="top-nav">
        {NAV_ITEMS.map((item) => (
          <button key={item.id} className={`nav-icon-button ${currentView === item.id ? "nav-icon-button--active" : ""}`} onClick={() => onChange(item.id)} type="button">
            {icons[item.id]}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="topbar-user">
        {currentUser ? (
          <>
            <button className="user-chip" onClick={() => onProfile(currentUser.username)} type="button">
              <Avatar username={currentUser.username} size="xs" />
              <span>{currentUser.display_name}</span>
            </button>
            <button className="ghost-text-button" onClick={onLogout} type="button">Log out</button>
          </>
        ) : <span className="muted-copy">Guest mode</span>}
      </div>
    </header>
  );
}

function CategoryTabs({ value, onChange }) {
  return <div className="category-tabs">{CATEGORIES.map((item) => <button key={item} className={`category-tab ${value === item ? "category-tab--active" : ""}`} onClick={() => onChange(item)} type="button">{item}</button>)}</div>;
}

function SidebarUser({ user, onProfile, extra }) {
  return (
    <button className="sidebar-user" onClick={() => onProfile(user.username)} type="button">
      <Avatar username={user.username} size="xs" />
      <div><strong>{user.display_name}</strong><span>@{user.username}</span></div>
      {extra ? <em>{extra}</em> : null}
    </button>
  );
}

function PostCard({ post, currentUserId, onLike, onOpen, onProfile }) {
  const [mediaShape, setMediaShape] = useState("square");

  return (
    <article className={`post-tile post-tile--${mediaShape}`}>
      <button className={`post-tile__media post-tile__media--${mediaShape}`} onClick={() => onOpen(post)} type="button">
        <img
          src={post.image_url}
          alt={post.description}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (!naturalWidth || !naturalHeight) {
              setMediaShape("square");
              return;
            }
            const ratio = naturalWidth / naturalHeight;
            if (ratio >= 1.25) setMediaShape("landscape");
            else if (ratio <= 0.82) setMediaShape("portrait");
            else setMediaShape("square");
          }}
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
          <button className="icon-action" onClick={() => onLike(post.id, currentUserId)} disabled={!currentUserId} type="button">{icons.heart}<span>{post.like_count}</span></button>
          <button className="icon-action" onClick={() => onOpen(post)} type="button">{icons.comment}<span>{post.comment_count}</span></button>
        </div>
      </div>
    </article>
  );
}

function CommentList({ comments, onProfile }) {
  if (!comments.length) return <p className="muted-copy">No comments yet.</p>;
  return (
    <div className="comment-list">
      {comments.map((comment) => (
        <article className="comment-item" key={comment.id}>
          <button className="author-row author-row--comment" onClick={() => onProfile(comment.username)} type="button">
            <Avatar username={comment.username} size="xs" />
            <div className="author-row__meta">
              <strong>{comment.display_name}</strong>
              <span>@{comment.username}</span>
            </div>
            <time>{formatDate(comment.created_at)}</time>
          </button>
          <p>{comment.body}</p>
        </article>
      ))}
    </div>
  );
}

function ThreadDrawer({ currentUser, post, comments, commentBody, setCommentBody, onComment, onClose, onProfile }) {
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
        <div className="thread-image-wrap"><img src={post.image_url} alt={post.description} /></div>
        <div className="thread-post-meta">
          <span className="post-chip">{post.category}</span>
          <div className="thread-post-stats"><span>{post.like_count} likes</span><span>{post.comment_count} comments</span></div>
        </div>
        <p className="thread-body">{post.description}</p>
        <form className="stack-form thread-form" onSubmit={onComment}>
          <label>
            Add Comment
            <textarea value={commentBody} onChange={(event) => setCommentBody(event.target.value)} placeholder={currentUser ? "Write something thoughtful..." : "Log in to comment"} disabled={!currentUser} required />
          </label>
          <button className="primary-pill-button" type="submit" disabled={!currentUser}>Post Comment</button>
        </form>
        <CommentList comments={comments} onProfile={onProfile} />
      </aside>
    </div>
  );
}

function ProfilePage({ profile, currentUser, onPostOpen }) {
  return (
    <section className="profile-page">
      <section className="profile-hero">
        <div className="profile-hero__head">
          <Avatar username={profile.user.username} size="lg" />
          <div className="profile-hero__meta">
            <h2>{profile.user.display_name}</h2>
            <p>@{profile.user.username}</p>
            <p className="profile-bio">{profile.user.bio || "This user has not written a bio yet."}</p>
          </div>
          <button className="primary-pill-button" type="button">{currentUser?.username === profile.user.username ? "My Profile" : "Profile"}</button>
        </div>
        <div className="profile-hero__stats">
          <div><strong>{profile.stats.post_count}</strong><span>Posts</span></div>
          <div><strong>{profile.stats.total_likes_received}</strong><span>Likes</span></div>
          <div><strong>{profile.stats.total_comments_received}</strong><span>Comments</span></div>
          <div><strong>{profile.recent_posts.length}</strong><span>Recent</span></div>
        </div>
      </section>
      <section className="profile-post-grid">
        {profile.recent_posts.map((post) => (
          <button className="profile-post-card" key={post.id} onClick={() => onPostOpen(post)} type="button">
            <img src={post.image_url} alt={post.description} />
            <span className="post-chip post-chip--overlay">{post.category}</span>
            <div className="profile-post-card__overlay">
              <p>{post.description}</p>
              <div><span>{post.like_count} likes</span><span>{post.comment_count} comments</span></div>
            </div>
          </button>
        ))}
      </section>
    </section>
  );
}

export default function App() {
  const [feed, setFeed] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [sortBy, setSortBy] = useState("recent");
  const [category, setCategory] = useState("All");
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedComments, setSelectedComments] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [status, setStatus] = useState("Loading content...");
  const [isFeedLoading, setIsFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState("");
  const [registration, setRegistration] = useState(blankRegistration);
  const [loginForm, setLoginForm] = useState(blankLogin);
  const [settingsForm, setSettingsForm] = useState(blankSettings);
  const [postForm, setPostForm] = useState(blankPost);
  const [commentBody, setCommentBody] = useState("");
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [browsingHistory, setBrowsingHistory] = useState([]);

  async function refreshUsers() {
    const nextUsers = await getUsers();
    setUsers(nextUsers);
    return nextUsers;
  }

  async function refreshFeed(nextSort = sortBy, nextCategory = category) {
    setIsFeedLoading(true);
    setFeedError("");
    try {
      const items = await getFeed(nextSort, nextCategory);
      setFeed(items);
      return items;
    } catch (error) {
      setFeed([]);
      setFeedError(error.message);
      throw error;
    } finally {
      setIsFeedLoading(false);
    }
  }

  async function loadAnalytics() {
    const overview = await getAnalyticsOverview();
    setAnalytics(overview);
  }

  async function loadProfile(username) {
    const profile = await getUserProfile(username);
    setSelectedProfile(profile);
    return profile;
  }

  async function loadHistory(username) {
    const history = await getUserHistory(username);
    setBrowsingHistory(history);
  }

  async function goProfile(username) {
    try {
      await loadProfile(username);
      setCurrentView("profile");
      setIsThreadOpen(false);
      setStatus(`Viewing @${username}'s profile`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function setLoggedInUser(user) {
    setCurrentUser(user);
    setLoginForm({ username: user.username, password: "" });
    setSettingsForm({ display_name: user.display_name, bio: user.bio ?? "", password: "" });
    localStorage.setItem(SESSION_KEY, user.username);
    await loadProfile(user.username);
    await loadHistory(user.username);
  }

  async function handleNavChange(nextView) {
    if (nextView === "profile") {
      if (selectedProfile?.user.username) return setCurrentView("profile");
      if (currentUser?.username) return goProfile(currentUser.username);
      setStatus("Log in first to open a profile.");
      return;
    }
    setCurrentView(nextView);
  }

  async function openPost(post) {
    const comments = await getPostComments(post.id);
    setSelectedPost(post);
    setSelectedComments(comments);
    setIsThreadOpen(true);
    await loadProfile(post.username);
    if (currentUser) {
      await recordPostView(post.id, currentUser.id);
      await loadHistory(currentUser.username);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([refreshUsers(), refreshFeed("recent", "All"), loadAnalytics()]);
        const savedUsername = localStorage.getItem(SESSION_KEY);
        if (savedUsername) {
          setLoginForm({ username: savedUsername, password: "" });
          setStatus("Enter your password to continue.");
        } else {
          setStatus("Browse first, then log in when you want to interact.");
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
      const user = await loginUser(loginForm.username, loginForm.password);
      await setLoggedInUser(user);
      setCurrentView("home");
      setStatus(`Welcome back, ${user.display_name}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    try {
      const user = await createUser(registration);
      await Promise.all([refreshUsers(), loadAnalytics()]);
      await setLoggedInUser(user);
      setRegistration(blankRegistration);
      setCurrentView("home");
      setStatus(`Account @${user.username} created.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleUpdateProfile(event) {
    event.preventDefault();
    if (!currentUser) return setStatus("Log in first.");
    try {
      const updated = await updateUser(currentUser.username, settingsForm);
      await setLoggedInUser(updated);
      await refreshUsers();
      setStatus("Profile updated.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleCreatePost(event) {
    event.preventDefault();
    if (!currentUser) return setStatus("Log in before publishing.");
    if (!postForm.imageFile) return setStatus("Choose an image first.");
    try {
      await createUploadedPost({
        userId: currentUser.id,
        category: postForm.category,
        description: postForm.description,
        imageFile: postForm.imageFile,
      });
      setPostForm(blankPost);
      await Promise.all([refreshFeed(sortBy, category), refreshUsers(), loadAnalytics(), loadProfile(currentUser.username)]);
      setCurrentView("home");
      setStatus("Post published.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleLike(postId, userId) {
    if (!userId) return setStatus("Log in to like posts.");
    try {
      await toggleLike(postId, userId);
      await Promise.all([refreshFeed(sortBy, category), loadAnalytics()]);
      if (selectedProfile) await loadProfile(selectedProfile.user.username);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleComment(event) {
    event.preventDefault();
    if (!currentUser || !selectedPost) return setStatus("Log in and open a post first.");
    try {
      await createComment(selectedPost.id, { user_id: currentUser.id, body: commentBody });
      setCommentBody("");
      const items = await refreshFeed(sortBy, category);
      await loadAnalytics();
      const updated = items.find((item) => item.id === selectedPost.id) ?? selectedPost;
      await openPost(updated);
      setStatus("Comment published.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  function logout() {
    setCurrentUser(null);
    setBrowsingHistory([]);
    localStorage.removeItem(SESSION_KEY);
    setCurrentView("home");
    setStatus("Logged out.");
  }

  return (
    <div className="social-app-shell">
      <div className="background-pattern" aria-hidden="true" />
      <TopNav currentView={currentView} onChange={handleNavChange} currentUser={currentUser} onProfile={goProfile} onLogout={logout} />
      <main className="page-stage">
        {currentView === "home" ? (
          <section className="page-grid">
            <section className="page-main">
              <section className="discovery-header">
                <div>
                  <span className="eyebrow">Discover</span>
                  <h2>Stay for One More Post</h2>
                  <p className="muted-copy">{status}</p>
                </div>
                <div className="feed-toolbar">
                  <button className={`sort-pill ${sortBy === "recent" ? "sort-pill--active" : ""}`} onClick={async () => { setSortBy("recent"); await refreshFeed("recent", category); }} type="button">Recent</button>
                  <button className={`sort-pill ${sortBy === "popular" ? "sort-pill--active" : ""}`} onClick={async () => { setSortBy("popular"); await refreshFeed("popular", category); }} type="button">Popular</button>
                </div>
              </section>
              <CategoryTabs value={category} onChange={async (value) => { setCategory(value); await refreshFeed(sortBy, value); }} />
              {isFeedLoading ? (
                <section className="feed-placeholder" aria-live="polite">
                  <div className="feed-placeholder__header">
                    <span className="eyebrow">Loading</span>
                    <h3>Preparing your feed</h3>
                    <p className="muted-copy">Fetching the latest posts and creators...</p>
                  </div>
                  <div className="feed-placeholder-grid">
                    {[0, 1, 2].map((item) => (
                      <article className="feed-skeleton-card" key={item} aria-hidden="true">
                        <div className="feed-skeleton-card__media" />
                        <div className="feed-skeleton-card__line feed-skeleton-card__line--short" />
                        <div className="feed-skeleton-card__line" />
                        <div className="feed-skeleton-card__line feed-skeleton-card__line--muted" />
                      </article>
                    ))}
                  </div>
                </section>
              ) : feedError ? (
                <section className="feed-placeholder feed-placeholder--error" role="status">
                  <span className="eyebrow">Feed unavailable</span>
                  <h3>We could not load the homepage.</h3>
                  <p>{feedError}</p>
                </section>
              ) : feed.length ? (
                <div className="feed-waterfall">
                  {feed.map((post) => <PostCard key={post.id} post={post} currentUserId={currentUser?.id} onLike={handleLike} onOpen={openPost} onProfile={goProfile} />)}
                </div>
              ) : (
                <section className="feed-placeholder" role="status">
                  <span className="eyebrow">No posts yet</span>
                  <h3>Your feed is ready for the first story.</h3>
                  <p className="muted-copy">Try a different category or come back after someone shares a new moment.</p>
                </section>
              )}
            </section>
            <aside className="page-side">
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Session</span><h2>{currentUser ? "Signed In" : "Guest"}</h2></div>
                {currentUser ? (
                  <button className="user-chip user-chip--full" onClick={() => goProfile(currentUser.username)} type="button">
                    <Avatar username={currentUser.username} size="sm" />
                    <div><strong>{currentUser.display_name}</strong><span>@{currentUser.username}</span></div>
                  </button>
                ) : <p className="muted-copy">Log in to like, comment, publish, and keep a browsing history.</p>}
              </section>
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Top Creators</span><h2>Recommended</h2></div>
                <div className="sidebar-list">
                  {analytics?.active_users?.slice(0, 4).map((user) => <SidebarUser key={user.user_id} user={user} onProfile={goProfile} extra={`${user.post_count} posts`} />)}
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {currentView === "create" ? (
          <section className="center-panel">
            <section className="sidebar-card sidebar-card--wide">
              <div className="card-header"><span className="eyebrow">Create</span><h2>Publish a New Post</h2></div>
              <form className="stack-form" onSubmit={handleCreatePost}>
                <label>Category
                  <select className="deco-select" value={postForm.category} onChange={(event) => setPostForm((current) => ({ ...current, category: event.target.value }))} disabled={!currentUser}>
                    {CATEGORIES.filter((item) => item !== "All").map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label>Caption
                  <textarea value={postForm.description} onChange={(event) => setPostForm((current) => ({ ...current, description: event.target.value }))} placeholder="Tell the feed what this moment means..." required disabled={!currentUser} />
                </label>
                <label>Upload Image
                  <input type="file" accept="image/*" onChange={(event) => setPostForm((current) => ({ ...current, imageFile: event.target.files?.[0] ?? null }))} required disabled={!currentUser} />
                </label>
                {postForm.imageFile ? <p className="muted-copy">Selected: {postForm.imageFile.name}</p> : null}
                <button className="primary-pill-button" type="submit" disabled={!currentUser}>Publish Now</button>
              </form>
            </section>
          </section>
        ) : null}

        {currentView === "profile" && selectedProfile ? <ProfilePage profile={selectedProfile} currentUser={currentUser} onPostOpen={openPost} /> : null}

        {currentView === "history" ? (
          <section className="center-panel">
            <section className="sidebar-card sidebar-card--wide">
              <div className="card-header"><span className="eyebrow">History</span><h2>Recently Viewed</h2></div>
              {browsingHistory.length ? (
                <div className="history-list">
                  {browsingHistory.map((entry) => (
                    <article key={`${entry.post_id}-${entry.viewed_at}`} className="history-record history-record--with-thumb">
                      <img src={entry.image_url} alt={entry.description} />
                      <div><strong>@{entry.username}</strong><span>{entry.description}</span><time>{formatDate(entry.viewed_at)}</time></div>
                      <button className="ghost-text-button" onClick={() => goProfile(entry.username)} type="button">View Author</button>
                    </article>
                  ))}
                </div>
              ) : <p className="muted-copy">Open posts after logging in and they will appear here.</p>}
            </section>
          </section>
        ) : null}

        {currentView === "analytics" ? (
          <section className="page-grid">
            <section className="page-main analytics-grid">
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Overview</span><h2>Platform Metrics</h2></div>
                <div className="stat-board">
                  <div><strong>{analytics?.total_users ?? 0}</strong><span>Users</span></div>
                  <div><strong>{analytics?.total_posts ?? 0}</strong><span>Posts</span></div>
                  <div><strong>{analytics?.total_comments ?? 0}</strong><span>Comments</span></div>
                  <div><strong>{analytics?.total_likes ?? 0}</strong><span>Likes</span></div>
                </div>
              </section>
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Top Content</span><h2>Highest Engagement</h2></div>
                <div className="history-list">
                  {analytics?.top_posts?.map((post) => <article className="history-record" key={post.post_id}><strong>{post.display_name}</strong><span>{post.description}</span><time>{post.like_count} likes · {post.comment_count} comments</time></article>)}
                </div>
              </section>
            </section>
            <aside className="page-side">
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Most Active</span><h2>Creator Ranking</h2></div>
                <div className="sidebar-list">
                  {analytics?.active_users?.map((user) => <SidebarUser key={user.user_id} user={user} onProfile={goProfile} extra={`${user.post_count}`} />)}
                </div>
              </section>
            </aside>
          </section>
        ) : null}

        {currentView === "settings" ? (
          <section className="page-grid">
            <section className="page-main">
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Log In</span><h2>Enter the Community</h2></div>
                <form className="stack-form" onSubmit={handleLogin}>
                  <label>Username
                    <input value={loginForm.username} onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))} required />
                  </label>
                  <label>Password
                    <input type="password" value={loginForm.password} onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))} required />
                  </label>
                  <button className="primary-pill-button" type="submit">Log In</button>
                </form>
                <p className="muted-copy">Demo passwords follow `username123`, except Sam which uses `sam123456`.</p>
              </section>
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Profile</span><h2>Edit Current Account</h2></div>
                <form className="stack-form" onSubmit={handleUpdateProfile}>
                  <label>Display Name
                    <input value={settingsForm.display_name} onChange={(event) => setSettingsForm((current) => ({ ...current, display_name: event.target.value }))} disabled={!currentUser} required />
                  </label>
                  <label>Bio
                    <textarea value={settingsForm.bio} onChange={(event) => setSettingsForm((current) => ({ ...current, bio: event.target.value }))} disabled={!currentUser} />
                  </label>
                  <label>New Password
                    <input type="password" value={settingsForm.password} onChange={(event) => setSettingsForm((current) => ({ ...current, password: event.target.value }))} disabled={!currentUser} placeholder="Leave blank to keep the current password" />
                  </label>
                  <button className="primary-pill-button" type="submit" disabled={!currentUser}>Save Profile</button>
                </form>
              </section>
            </section>
            <aside className="page-side">
              <section className="sidebar-card">
                <div className="card-header"><span className="eyebrow">Register</span><h2>Create a New Account</h2></div>
                <form className="stack-form" onSubmit={handleRegister}>
                  <label>Username
                    <input value={registration.username} onChange={(event) => setRegistration((current) => ({ ...current, username: event.target.value }))} required />
                  </label>
                  <label>Password
                    <input type="password" value={registration.password} onChange={(event) => setRegistration((current) => ({ ...current, password: event.target.value }))} required />
                  </label>
                  <label>Display Name
                    <input value={registration.display_name} onChange={(event) => setRegistration((current) => ({ ...current, display_name: event.target.value }))} required />
                  </label>
                  <label>Bio
                    <input value={registration.bio} onChange={(event) => setRegistration((current) => ({ ...current, bio: event.target.value }))} />
                  </label>
                  <button className="primary-pill-button" type="submit">Create Account</button>
                </form>
                <div className="sidebar-list">
                  {users.map((user) => (
                    <button className="sidebar-user" key={user.id} onClick={() => setLoginForm({ username: user.username, password: demoPassword(user.username) })} type="button">
                      <Avatar username={user.username} size="xs" />
                      <div><strong>{user.display_name}</strong><span>@{user.username}</span></div>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </section>
        ) : null}
      </main>
      <ThreadDrawer currentUser={currentUser} post={isThreadOpen ? selectedPost : null} comments={selectedComments} commentBody={commentBody} setCommentBody={setCommentBody} onComment={handleComment} onClose={() => setIsThreadOpen(false)} onProfile={goProfile} />
    </div>
  );
}
