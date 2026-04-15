import Avatar from "../components/Avatar";

export default function ProfilePage({
  profile,
  currentUser,
  onPostOpen,
  onNavigateHome,
  onNavigateProfile,
  onToggleFollow,
  isOwnProfile = false,
  isGuestProfile = false,
  isUserPage = false,
}) {
  const isFollowActionVisible = !!currentUser && !isOwnProfile && !isGuestProfile;
  const followLabel = profile.is_following ? "Unfollow" : "Follow";
  const followButtonClassName = profile.is_following ? "ghost-frame-button" : "primary-pill-button";

  return (
    <section className="profile-page">
      {isUserPage ? (
        <section className="profile-route-banner">
          <div>
            <span className="eyebrow">Author Page</span>
            <h2>Visiting @{profile.user.username}</h2>
            <p className="muted-copy">This route is separate from your own profile. Use it to explore another creator's salon without replacing your account page.</p>
          </div>
          <div className="profile-route-banner__actions">
            <button className="ghost-frame-button" onClick={onNavigateHome} type="button">Back to Discover</button>
            <button className="ghost-frame-button" onClick={onNavigateProfile} type="button">{currentUser ? "Go to My Profile" : "Open Guest Profile"}</button>
          </div>
        </section>
      ) : null}
      <section className="profile-hero">
        <div className="profile-hero__head">
          <Avatar username={profile.user.username} size="lg" />
          <div className="profile-hero__meta">
            <h2>{profile.user.display_name}</h2>
            <p>@{profile.user.username}</p>
            <p className="profile-bio">{profile.user.bio || (isGuestProfile ? "Log in to turn this guest lounge into your personal salon." : "This user has not written a bio yet.")}</p>
          </div>
          <button
            className={isFollowActionVisible ? followButtonClassName : "primary-pill-button"}
            type="button"
            onClick={isFollowActionVisible ? () => onToggleFollow(profile.user.username) : undefined}
            disabled={!isFollowActionVisible}
          >
            {isGuestProfile ? "Guest" : isOwnProfile ? "My Profile" : followLabel}
          </button>
        </div>
        <div className="profile-hero__stats">
          <div><strong>{profile.stats.post_count}</strong><span>Posts</span></div>
          <div><strong>{profile.stats.total_likes_received}</strong><span>Likes</span></div>
          <div><strong>{profile.stats.total_comments_received}</strong><span>Comments</span></div>
          <div><strong>{profile.stats.followers_count}</strong><span>Followers</span></div>
        </div>
      </section>
      {profile.recent_posts.length ? (
        <section className="profile-post-grid">
          {profile.recent_posts.map((post) => (
            <button className="profile-post-card" key={post.id} onClick={() => onPostOpen(post)} type="button">
              <img src={post.image_url} alt={post.description} loading="lazy" decoding="async" />
              <span className="post-chip post-chip--overlay">{post.category}</span>
              <div className="profile-post-card__overlay">
                <p>{post.description}</p>
                <div><span>{post.like_count} likes</span><span>{post.comment_count} comments</span></div>
              </div>
            </button>
          ))}
        </section>
      ) : (
        <section className="sidebar-card sidebar-card--wide">
          <div className="card-header"><span className="eyebrow">{isGuestProfile ? "Guest" : "No Posts Yet"}</span><h2>{isGuestProfile ? "Sign In To Build Your Salon" : "This Salon Is Quiet For Now"}</h2></div>
          <p className="muted-copy">{isGuestProfile ? "Your profile route is available even before login. Stats stay at zero until you sign in and start posting." : "This user has not published any posts yet."}</p>
        </section>
      )}
    </section>
  );
}
