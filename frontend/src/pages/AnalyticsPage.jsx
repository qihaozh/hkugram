import SidebarUser from "../components/SidebarUser";

export default function AnalyticsPage({ analytics, isLoading, onOpenProfile }) {
  if (isLoading && !analytics) {
    return (
      <section className="center-panel">
        <section className="sidebar-card sidebar-card--wide" role="status" aria-live="polite">
          <div className="card-header"><span className="eyebrow">Loading</span><h2>Preparing Analytics</h2></div>
          <p className="muted-copy">Fetching platform metrics and creator rankings...</p>
        </section>
      </section>
    );
  }

  return (
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
            {analytics?.top_posts?.map((post) => <article className="history-record" key={post.post_id}><strong>{post.display_name}</strong><span>{post.description}</span><time>{post.like_count} likes | {post.comment_count} comments</time></article>)}
          </div>
        </section>
      </section>
      <aside className="page-side">
        <section className="sidebar-card">
          <div className="card-header"><span className="eyebrow">Most Active</span><h2>Creator Ranking</h2></div>
          <div className="sidebar-list">
            {analytics?.active_users?.map((user) => <SidebarUser key={user.user_id} user={user} onProfile={onOpenProfile} extra={`${user.post_count}`} />)}
          </div>
        </section>
      </aside>
    </section>
  );
}
