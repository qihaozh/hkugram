import Avatar from "../components/Avatar";
import { useEffect } from "react";
import CategoryTabs from "../components/CategoryTabs";
import DiscoveryAgent from "../components/DiscoveryAgent";
import MasonryFeed from "../components/MasonryFeed";
import SidebarUser from "../components/SidebarUser";
import { icons } from "../lib/icons";

export default function HomePage({
  category,
  currentUser,
  feed,
  feedError,
  hasMoreFeed,
  isFeedLoading,
  isFeedLoadingMore,
  onCategoryChange,
  onLike,
  onLoadMoreFeed,
  onOpenPost,
  onOpenPostById,
  onOpenProfile,
  onOpenSelfProfile,
  onRefreshCreators,
  onSortChange,
  recommendedCreators,
  sortBy,
  status,
  syncVisibleFeedCount,
}) {
  useEffect(() => {
    syncVisibleFeedCount(feed.length);
  }, [feed.length, syncVisibleFeedCount]);

  return (
    <section className="page-grid">
      <section className="page-main">
        <section className="discovery-header">
          <div>
            <span className="eyebrow">Discover</span>
            <h2>Stay for One More Post</h2>
            <p className="muted-copy">{status}</p>
          </div>
          <div className="feed-toolbar">
            <button className={`sort-pill ${sortBy === "recent" ? "sort-pill--active" : ""}`} onClick={() => onSortChange("recent")} type="button">Recent</button>
            <button className={`sort-pill ${sortBy === "popular" ? "sort-pill--active" : ""}`} onClick={() => onSortChange("popular")} type="button">Popular</button>
          </div>
        </section>
        <CategoryTabs value={category} onChange={onCategoryChange} />
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
          <>
          <MasonryFeed
            ariaLabel="Discover feed"
            currentUserId={currentUser?.id}
            onLike={onLike}
            onOpen={onOpenPost}
            onProfile={onOpenProfile}
            posts={feed}
          />
          {hasMoreFeed ? (
            <div className="feed-load-more">
              <button className="ghost-frame-button" onClick={onLoadMoreFeed} type="button" disabled={isFeedLoadingMore}>
                {isFeedLoadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          ) : null}
          </>
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
            <button className="user-chip user-chip--full" onClick={onOpenSelfProfile} type="button">
              <Avatar username={currentUser.username} size="sm" />
              <div><strong>{currentUser.display_name}</strong><span>@{currentUser.username}</span></div>
            </button>
          ) : <p className="muted-copy">Log in to like, comment, publish, and keep a browsing history.</p>}
        </section>
        <section className="sidebar-card">
          <div className="card-header card-header--with-action">
            <div>
              <span className="eyebrow">Top Creators</span>
              <h2>Recommended</h2>
            </div>
            <button
              className="ghost-text-button creator-randomizer-button"
              onClick={onRefreshCreators}
              type="button"
              aria-label="Randomize creator recommendations"
              title="Randomize creator recommendations"
            >
              {icons.shuffle}
            </button>
          </div>
          <div className="sidebar-list">
            {recommendedCreators.map((user) => <SidebarUser key={user.user_id} user={user} onProfile={onOpenProfile} extra={`${user.post_count} posts`} />)}
          </div>
        </section>
      </aside>
      <DiscoveryAgent onOpenPostById={onOpenPostById} />
    </section>
  );
}
