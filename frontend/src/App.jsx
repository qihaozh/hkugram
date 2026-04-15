import ThreadDrawer from "./components/ThreadDrawer";
import TopNav from "./components/TopNav";
import { useAppController } from "./hooks/useAppController";
import AnalyticsPage from "./pages/AnalyticsPage";
import CreatePage from "./pages/CreatePage";
import HistoryPage from "./pages/HistoryPage";
import HomePage from "./pages/HomePage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  const {
    activeProfile,
    browsingHistory,
    category,
    currentUser,
    currentView,
    feed,
    feedError,
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
    isFeedLoading,
    isOwnProfileRoute,
    isThreadOpen,
    loginForm,
    logout,
    navigate,
    openHistoryPost,
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
    users,
  } = useAppController();

  return (
    <div className="social-app-shell">
      <div className="background-pattern" aria-hidden="true" />
      <TopNav currentView={currentView === "user" ? "" : currentView} onChange={handleNavChange} currentUser={currentUser} onProfile={goMyProfile} onLogout={logout} />
      <main className="page-stage">
        {currentView === "home" ? (
          <HomePage
            category={category}
            currentUser={currentUser}
            feed={feed}
            feedError={feedError}
            isFeedLoading={isFeedLoading}
            onCategoryChange={handleCategoryChange}
            onLike={handleLike}
            onOpenPost={openPost}
            onOpenProfile={goUserPage}
            onOpenSelfProfile={goMyProfile}
            onRefreshCreators={refreshRecommendedCreators}
            onSortChange={handleSortChange}
            recommendedCreators={recommendedCreators}
            sortBy={sortBy}
            status={status}
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
          <AnalyticsPage analytics={analytics} onOpenProfile={goUserPage} />
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
