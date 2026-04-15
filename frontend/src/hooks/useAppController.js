import { useCallback, useEffect, useState } from "react";
import {
  createComment,
  createUploadedPost,
  createUser,
  getAnalyticsOverview,
  getCurrentSession,
  getFeed,
  getPost,
  getPostComments,
  getUserHistory,
  getUserProfileForViewer,
  getUsers,
  loginUser,
  logoutUser,
  recordPostView,
  toggleFollow,
  toggleLike,
  updateUser,
} from "../api";
import { blankLogin, blankPost, blankRegistration, blankSettings } from "../lib/constants";
import { guestProfile, parseRoute, routeToPath } from "../lib/routes";

function shuffleItems(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

export function useAppController() {
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
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [browsingHistory, setBrowsingHistory] = useState([]);
  const [recommendedCreators, setRecommendedCreators] = useState([]);
  const [followingUsernames, setFollowingUsernames] = useState([]);

  const currentView = route.view === "user" ? "user" : route.view;
  const isOwnProfileRoute = route.view === "profile";
  const activeProfile = isOwnProfileRoute ? (selectedProfile ?? guestProfile) : route.view === "user" ? selectedProfile : null;

  const navigate = useCallback((nextRoute) => {
    const normalized = typeof nextRoute === "string" ? parseRoute(nextRoute) : nextRoute;
    const nextPath = typeof nextRoute === "string" ? nextRoute : routeToPath(normalized);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setRoute(normalized);
  }, []);

  const refreshUsers = useCallback(async () => {
    const nextUsers = await getUsers();
    setUsers(nextUsers);
    return nextUsers;
  }, []);

  const refreshFeed = useCallback(async (nextSort = sortBy, nextCategory = category) => {
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
  }, [category, sortBy]);

  const loadAnalytics = useCallback(async () => {
    const overview = await getAnalyticsOverview();
    setAnalytics(overview);
  }, []);

  const loadProfile = useCallback(async (username, viewerUserId = currentUser?.id) => {
    const profile = await getUserProfileForViewer(username, viewerUserId);
    setSelectedProfile(profile);
    if (currentUser?.username && profile.user.username === currentUser.username) {
      setFollowingUsernames(profile.following_usernames ?? []);
    }
    return profile;
  }, [currentUser?.id, currentUser?.username]);

  const loadHistory = useCallback(async (username) => {
    const history = await getUserHistory(username);
    setBrowsingHistory(history);
  }, []);

  const goUserPage = useCallback(async (username) => {
    try {
      await loadProfile(username);
      navigate({ view: "user", username });
      setIsThreadOpen(false);
      setStatus(`Viewing @${username}'s salon`);
    } catch (error) {
      setStatus(error.message);
    }
  }, [loadProfile, navigate]);

  const goMyProfile = useCallback(async () => {
    setIsThreadOpen(false);
    if (currentUser?.username) {
      try {
        await loadProfile(currentUser.username);
      } catch (error) {
        setStatus(error.message);
      }
    } else {
      setSelectedProfile(null);
    }
    navigate({ view: "profile" });
    setStatus(currentUser ? `Viewing your profile, @${currentUser.username}` : "Browsing the guest profile.");
  }, [currentUser, loadProfile, navigate]);

  const setLoggedInUser = useCallback(async (user) => {
    setCurrentUser(user);
    setLoginForm({ username: user.username, password: "" });
    setSettingsForm({ display_name: user.display_name, bio: user.bio ?? "", password: "" });
    await loadProfile(user.username);
    await loadHistory(user.username);
  }, [loadHistory, loadProfile]);

  const handleNavChange = useCallback(async (nextView) => {
    if (nextView === "profile") {
      await goMyProfile();
      return;
    }
    navigate({ view: nextView });
  }, [goMyProfile, navigate]);

  const openPost = useCallback(async (post) => {
    const comments = await getPostComments(post.id);
    setSelectedPost(post);
    setSelectedComments(comments);
    setIsThreadOpen(true);
    if (currentUser) {
      await recordPostView(post.id, currentUser.id);
      await loadHistory(currentUser.username);
    }
  }, [currentUser, loadHistory]);

  const openHistoryPost = useCallback(async (postId) => {
    try {
      const post = await getPost(postId);
      await openPost(post);
      setStatus("Opened post from history.");
    } catch (error) {
      setStatus(error.message);
    }
  }, [openPost]);

  useEffect(() => {
    async function bootstrap() {
      try {
        await refreshFeed("recent", "All");
        setStatus("Browse first, then log in when you want to interact.");

        window.setTimeout(async () => {
          try {
            await Promise.all([refreshUsers(), loadAnalytics()]);
            try {
              const sessionUser = await getCurrentSession();
              await setLoggedInUser(sessionUser);
              setStatus(`Welcome back, ${sessionUser.display_name}.`);
            } catch {
              // Keep guest browsing state when no session is present.
            }
          } catch (error) {
            setStatus(error.message);
          }
        }, 0);
      } catch (error) {
        setStatus(error.message);
      }
    }
    bootstrap();
  }, [loadAnalytics, refreshFeed, refreshUsers, setLoggedInUser]);

  useEffect(() => {
    function syncRoute() {
      setRoute(parseRoute(window.location.pathname));
    }
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  useEffect(() => {
    async function syncProfileRoute() {
      if (route.view === "profile") {
        if (currentUser?.username) {
          try {
            await loadProfile(currentUser.username);
          } catch (error) {
            setStatus(error.message);
          }
        } else {
          setSelectedProfile(null);
        }
        return;
      }
      if (route.view === "user" && route.username) {
        try {
          await loadProfile(route.username);
        } catch (error) {
          setSelectedProfile(null);
          setStatus(error.message);
        }
      }
    }
    syncProfileRoute();
  }, [route.view, route.username, currentUser?.username]);

  const handleLogin = useCallback(async (event) => {
    event.preventDefault();
    try {
      const user = await loginUser(loginForm.username, loginForm.password);
      await setLoggedInUser(user);
      navigate({ view: "home" });
      setStatus(`Welcome back, ${user.display_name}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }, [loginForm.password, loginForm.username, navigate, setLoggedInUser]);

  const handleRegister = useCallback(async (event) => {
    event.preventDefault();
    try {
      await createUser(registration);
      const user = await loginUser(registration.username, registration.password);
      await Promise.all([refreshUsers(), loadAnalytics()]);
      await setLoggedInUser(user);
      setRegistration(blankRegistration);
      navigate({ view: "home" });
      setStatus(`Account @${user.username} created.`);
    } catch (error) {
      setStatus(error.message);
    }
  }, [loadAnalytics, navigate, refreshUsers, registration, setLoggedInUser]);

  const handleUpdateProfile = useCallback(async (event) => {
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
  }, [currentUser, refreshUsers, setLoggedInUser, settingsForm]);

  const handleCreatePost = useCallback(async (event) => {
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
      navigate({ view: "home" });
      setStatus("Post published.");
    } catch (error) {
      setStatus(error.message);
    }
  }, [category, currentUser, loadAnalytics, loadProfile, navigate, postForm, refreshFeed, refreshUsers, sortBy]);

  const handleLike = useCallback(async (postId, userId) => {
    if (!userId) return setStatus("Log in to like posts.");
    try {
      await toggleLike(postId, userId);
      await Promise.all([refreshFeed(sortBy, category), loadAnalytics()]);
      if (route.view === "profile" && currentUser?.username) await loadProfile(currentUser.username);
      if (route.view === "user" && route.username) await loadProfile(route.username);
    } catch (error) {
      setStatus(error.message);
    }
  }, [category, currentUser, loadAnalytics, loadProfile, refreshFeed, route.username, route.view, sortBy]);

  const handleComment = useCallback(async (body, resetDraft) => {
    if (!currentUser || !selectedPost) return setStatus("Log in and open a post first.");
    try {
      await createComment(selectedPost.id, { user_id: currentUser.id, body });
      resetDraft();
      const items = await refreshFeed(sortBy, category);
      await loadAnalytics();
      const updated = items.find((item) => item.id === selectedPost.id) ?? selectedPost;
      await openPost(updated);
      setStatus("Comment published.");
    } catch (error) {
      setStatus(error.message);
    }
  }, [category, currentUser, loadAnalytics, openPost, refreshFeed, selectedPost, sortBy]);

  const handleSortChange = useCallback(async (nextSort) => {
    setSortBy(nextSort);
    await refreshFeed(nextSort, category);
  }, [category, refreshFeed]);

  const handleCategoryChange = useCallback(async (nextCategory) => {
    setCategory(nextCategory);
    await refreshFeed(sortBy, nextCategory);
  }, [refreshFeed, sortBy]);

  const refreshRecommendedCreators = useCallback(() => {
    const rankedUsers = analytics?.active_users ?? [];
    const seen = new Set(rankedUsers.map((user) => user.username));
    const excluded = new Set([currentUser?.username, ...followingUsernames].filter(Boolean));
    const rankedCandidates = shuffleItems(
      rankedUsers.filter((user) => !excluded.has(user.username))
    );
    const fallbackUsers = users
      .filter((user) => !excluded.has(user.username))
      .filter((user) => !seen.has(user.username))
      .map((user) => ({
        user_id: user.id,
        username: user.username,
        display_name: user.display_name,
        post_count: 0,
      }));

    const combined = [...rankedCandidates, ...shuffleItems(fallbackUsers)];
    setRecommendedCreators(combined.slice(0, 4));
  }, [analytics?.active_users, currentUser?.username, followingUsernames, users]);

  useEffect(() => {
    refreshRecommendedCreators();
  }, [refreshRecommendedCreators]);

  const handleToggleFollow = useCallback(async (username) => {
    if (!currentUser) return setStatus("Log in to follow creators.");
    try {
      const result = await toggleFollow(username, currentUser.id);
      setFollowingUsernames((current) => {
        const next = new Set(current);
        if (result.is_following) next.add(result.username);
        else next.delete(result.username);
        return [...next].sort();
      });
      await loadProfile(username, currentUser.id);
      setStatus(result.is_following ? `Now following @${username}.` : `Unfollowed @${username}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }, [currentUser, loadProfile]);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setCurrentUser(null);
      setSelectedProfile(null);
      setBrowsingHistory([]);
      setFollowingUsernames([]);
      navigate({ view: "home" });
      setStatus("Logged out.");
    }
  }, [navigate]);

  return {
    activeProfile,
    analytics,
    browsingHistory,
    category,
    currentUser,
    currentView,
    feed,
    feedError,
    followingUsernames,
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
    navigate,
    openHistoryPost,
    openPost,
    logout,
    postForm,
    recommendedCreators,
    registration,
    route,
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
    refreshRecommendedCreators,
    goMyProfile,
    goUserPage,
  };
}
