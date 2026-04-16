import ThreadDrawer from "./components/ThreadDrawer";
import TopNav from "./components/TopNav";
import { useAppController } from "./hooks/useAppController";
import AnalyticsPage from "./pages/AnalyticsPage";
import CreatePage from "./pages/CreatePage";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const {
    activeProfile,
    analytics,
    browsingHistory,
    category,
    currentUser,
    currentView,
    feed,
    feedError,
    hasMoreFeed,
    goMyProfile,
    goUserPage,
    handleCategoryChange,
    handleComment,
    handleCreatePost,
    handleLike,
    handleLogin,
    handleNavChange,
    handleRegister,
    handleSortChange,
    handleToggleFollow,
    handleUpdateProfile,
    isAnalyticsLoading,
    isFeedLoading,
    isFeedLoadingMore,
    isOwnProfileRoute,
    isThreadOpen,
    loginForm,
    logout,
    loadMoreFeed,
    navigate,
    openHistoryPost,
    openPostById,
    openPost,
    postForm,
    recommendedCreators,
    registration,
    refreshRecommendedCreators,
    selectedComments,
    selectedPost,
    setIsThreadOpen,
    setLoginForm,
    setPostForm,
    setRegistration,
    setSettingsForm,
    settingsForm,
    sortBy,
    status,
    syncVisibleFeedCount,
    users,
  } = useAppController();

  return (
    <div className="social-app-shell">
      <TopNav currentView={currentView === "user" ? "" : currentView} onChange={handleNavChange} currentUser={currentUser} onProfile={goMyProfile} onLogout={logout} />
      <main className="page-stage">
        {currentView === "home" ? (
          <HomePage
            category={category}
            currentUser={currentUser}
            feed={feed}
            feedError={feedError}
            hasMoreFeed={hasMoreFeed}
            isFeedLoading={isFeedLoading}
            isFeedLoadingMore={isFeedLoadingMore}
            onCategoryChange={handleCategoryChange}
            onLike={handleLike}
            onLoadMoreFeed={loadMoreFeed}
            onOpenPost={openPost}
            onOpenPostById={openPostById}
            onOpenProfile={goUserPage}
            onOpenSelfProfile={goMyProfile}
            onRefreshCreators={refreshRecommendedCreators}
            onSortChange={handleSortChange}
            recommendedCreators={recommendedCreators}
            sortBy={sortBy}
            status={status}
            syncVisibleFeedCount={syncVisibleFeedCount}
          />
        ) : null}

        {currentView === "create" ? (
          <CreatePage currentUser={currentUser} postForm={postForm} setPostForm={setPostForm} onSubmit={handleCreatePost} />
        ) : null}

        {(currentView === "profile" || currentView === "user") && activeProfile ? (
          <ProfilePage
            profile={activeProfile}
            currentUser={currentUser}
            onPostOpen={openPost}
            onNavigateHome={() => navigate({ view: "home" })}
            onNavigateProfile={goMyProfile}
            onToggleFollow={handleToggleFollow}
            isOwnProfile={isOwnProfileRoute && !!currentUser}
            isGuestProfile={isOwnProfileRoute && !currentUser}
            isUserPage={currentView === "user"}
          />
        ) : null}

        {currentView === "history" ? (
          <HistoryPage browsingHistory={browsingHistory} onOpenHistoryPost={openHistoryPost} />
        ) : null}

        {currentView === "analytics" ? (
          <AnalyticsPage analytics={analytics} isLoading={isAnalyticsLoading} onOpenProfile={goUserPage} />
        ) : null}

        {currentView === "search" ? (
          <SearchPage currentUser={currentUser} onLike={handleLike} onOpenPost={openPost} onOpenProfile={goUserPage} />
        ) : null}

        {currentView === "settings" ? (
          <SettingsPage
            currentUser={currentUser}
            loginForm={loginForm}
            onLoginSubmit={handleLogin}
            onRegistrationSubmit={handleRegister}
            onSettingsSubmit={handleUpdateProfile}
            registration={registration}
            setLoginForm={setLoginForm}
            setRegistration={setRegistration}
            setSettingsForm={setSettingsForm}
            settingsForm={settingsForm}
            users={users}
          />
        ) : null}
      </main>
      <ThreadDrawer currentUser={currentUser} post={isThreadOpen ? selectedPost : null} comments={selectedComments} onComment={handleComment} onClose={() => setIsThreadOpen(false)} onProfile={goUserPage} />
    </div>
  );
}
