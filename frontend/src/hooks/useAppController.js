import { useCallback, useEffect, useRef, useState } from "react";
import {
  createComment,
  createUrlPost,
  createUploadedPost,
  createUser,
  getCurrentSession,
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
import { useAnalyticsController } from "./useAnalyticsController";
import { useFeedController } from "./useFeedController";
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

function applyLikeState(post, liked, likeCount) {
  return {
    ...post,
    like_count: likeCount,
    liked_by_viewer: liked,
  };
}

function patchProfilePosts(posts, postId, liked, likeCount) {
  let matched = false;
  let previousLikeCount = null;

  const nextPosts = posts.map((post) => {
    if (post.id !== postId) return post;
    matched = true;
    previousLikeCount = post.like_count ?? 0;
    return applyLikeState(post, liked, likeCount);
  });

  return { matched, nextPosts, previousLikeCount };
}

function getOptimisticLikeCount(currentLikeCount, currentLiked, intent) {
  if (intent === "like") {
    return currentLiked ? currentLikeCount : currentLikeCount + 1;
  }
  if (intent === "unlike") {
    return currentLiked ? Math.max(0, currentLikeCount - 1) : currentLikeCount;
  }
  return currentLikeCount;
}

export function useAppController() {
  const [currentUser, setCurrentUser] = useState(null);
  const {
    category,
    feed,
    feedError,
    hasMoreFeed,
    isFeedLoading,
    isFeedLoadingMore,
    loadMoreFeed,
    patchFeedPost,
    refreshFeed,
    resetFeed,
    sortBy,
    syncVisibleFeedCount,
  } = useFeedController("recent", "All", currentUser?.id ?? null);
  const { analytics, isAnalyticsLoading, loadAnalytics } = useAnalyticsController();
  const [users, setUsers] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedComments, setSelectedComments] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [status, setStatus] = useState("Loading content...");
  const [registration, setRegistration] = useState(blankRegistration);
  const [loginForm, setLoginForm] = useState(blankLogin);
  const [settingsForm, setSettingsForm] = useState(blankSettings);
  const [postForm, setPostForm] = useState(blankPost);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [browsingHistory, setBrowsingHistory] = useState([]);
  const [recommendedCreators, setRecommendedCreators] = useState([]);
  const [followingUsernames, setFollowingUsernames] = useState([]);
  const profileRequestIdRef = useRef(0);
  const likeRequestIdsRef = useRef(new Set());

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

  const loadProfile = useCallback(async (username, viewerUserId = currentUser?.id) => {
    const requestId = profileRequestIdRef.current + 1;
    profileRequestIdRef.current = requestId;
    const profile = await getUserProfileForViewer(username, viewerUserId);
    if (profileRequestIdRef.current === requestId) {
      setSelectedProfile(profile);
    }
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
    try {
      const [postDetail, comments] = await Promise.all([
        getPost(post.id, currentUser?.id),
        getPostComments(post.id),
      ]);
      setSelectedPost(postDetail);
      setSelectedComments(comments);
      setIsThreadOpen(true);
      if (currentUser) {
        await recordPostView(post.id, currentUser.id);
        await loadHistory(currentUser.username);
      }
      return postDetail;
    } catch (error) {
      setStatus(error.message);
      return null;
    }
  }, [currentUser, loadHistory]);

  const openHistoryPost = useCallback(async (postId) => {
    const post = await openPost({ id: postId });
    if (post) setStatus("Opened post from history.");
  }, [openPost]);

  const openPostById = useCallback(async (postId) => {
    const post = await openPost({ id: postId });
    if (post) setStatus("Opened post.");
  }, [openPost]);

  useEffect(() => {
    async function bootstrap() {
      try {
        if (route.view === "analytics") {
          await loadAnalytics();
          setStatus("Analytics ready.");
        } else {
          await resetFeed(sortBy, category);
          setStatus("Browse first, then log in when you want to interact.");
        }

        window.setTimeout(async () => {
          try {
            const followUpTasks = [refreshUsers()];
            if (route.view === "analytics") {
              followUpTasks.push(refreshFeed({ nextSort: sortBy, nextCategory: category }));
            } else {
              followUpTasks.push(loadAnalytics());
            }

            await Promise.all(followUpTasks);
            try {
              const sessionUser = await getCurrentSession();
              await setLoggedInUser(sessionUser);
              if (route.view === "user" && route.username) {
                await loadProfile(route.username, sessionUser.id);
                setStatus(`Viewing @${route.username}'s salon`);
              } else {
                setStatus(`Welcome back, ${sessionUser.display_name}.`);
              }
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
  }, [loadAnalytics, loadProfile, refreshFeed, refreshUsers, resetFeed, route.username, route.view, setLoggedInUser]);

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
    try {
      if (postForm.imageSource === "upload") {
        if (!postForm.imageFile) return setStatus("Choose an image first.");
        await createUploadedPost({
          userId: currentUser.id,
          category: postForm.category,
          description: postForm.description,
          imageFile: postForm.imageFile,
        });
      } else {
        if (!postForm.imageUrl.trim()) return setStatus("Paste an image URL first.");
        await createUrlPost({
          userId: currentUser.id,
          category: postForm.category,
          description: postForm.description,
          imageUrl: postForm.imageUrl.trim(),
        });
      }
      setPostForm(blankPost);
      await Promise.all([
        refreshFeed({ nextSort: sortBy, nextCategory: category, limit: Math.max(feed.length, 9) }),
        refreshUsers(),
        loadAnalytics(),
        loadProfile(currentUser.username),
      ]);
      navigate({ view: "home" });
      setStatus("Post published.");
    } catch (error) {
      setStatus(error.message);
    }
  }, [category, currentUser, feed.length, loadAnalytics, loadProfile, navigate, postForm, refreshFeed, refreshUsers, sortBy]);

  const syncLikedPost = useCallback((postId, liked, likeCount, options = {}) => {
    const { postOwnerUsername = null, previousLikeCount = likeCount } = options;

    patchFeedPost(postId, (post) => applyLikeState(post, liked, likeCount));

    setSelectedPost((currentPost) => {
      if (!currentPost || currentPost.id !== postId) return currentPost;
      return applyLikeState(currentPost, liked, likeCount);
    });

    setSelectedProfile((currentProfile) => {
      if (!currentProfile) return currentProfile;

      const { matched, nextPosts, previousLikeCount: profilePreviousLikeCount } = patchProfilePosts(
        currentProfile.recent_posts,
        postId,
        liked,
        likeCount
      );

      const isProfileOwner = currentProfile.user.username === postOwnerUsername || matched;
      const baseLikeCount = matched
        ? (profilePreviousLikeCount ?? previousLikeCount)
        : previousLikeCount;
      const likeDelta = isProfileOwner ? likeCount - baseLikeCount : 0;

      if (!matched && !likeDelta) return currentProfile;

      return {
        ...currentProfile,
        recent_posts: matched ? nextPosts : currentProfile.recent_posts,
        stats: likeDelta ? {
          ...currentProfile.stats,
          total_likes_received: Math.max(0, currentProfile.stats.total_likes_received + likeDelta),
        } : currentProfile.stats,
      };
    });
  }, [patchFeedPost]);

  const handleLike = useCallback(async (postId, userId, options = {}) => {
    if (!userId) return setStatus("Log in to like posts.");

    const knownPost = selectedPost?.id === postId
      ? selectedPost
      : feed.find((post) => post.id === postId)
        ?? selectedProfile?.recent_posts.find((post) => post.id === postId)
        ?? null;
    const currentLiked = options.currentLiked ?? Boolean(knownPost?.liked_by_viewer);
    const currentLikeCount = options.currentLikeCount ?? (knownPost?.like_count ?? 0);
    const requestedIntent = options.intent ?? "toggle";
    const nextIntent = requestedIntent === "toggle"
      ? (currentLiked ? "unlike" : "like")
      : requestedIntent;
    const postOwnerUsername = options.postOwnerUsername
      ?? knownPost?.username
      ?? (selectedProfile?.recent_posts.find((post) => post.id === postId)?.username ?? null);

    if ((nextIntent === "like" && currentLiked) || (nextIntent === "unlike" && !currentLiked)) {
      return { post_id: postId, liked: currentLiked, like_count: currentLikeCount };
    }

    if (likeRequestIdsRef.current.has(postId)) return null;

    const optimisticLikeCount = getOptimisticLikeCount(currentLikeCount, currentLiked, nextIntent);
    likeRequestIdsRef.current.add(postId);
    syncLikedPost(postId, nextIntent === "like", optimisticLikeCount, {
      postOwnerUsername,
      previousLikeCount: currentLikeCount,
    });

    try {
      const likeResult = await toggleLike(postId, userId, nextIntent);
      syncLikedPost(postId, likeResult.liked, likeResult.like_count, {
        postOwnerUsername,
        previousLikeCount: currentLikeCount,
      });
      loadAnalytics().catch(() => {});
      return likeResult;
    } catch (error) {
      syncLikedPost(postId, currentLiked, currentLikeCount, {
        postOwnerUsername,
        previousLikeCount: optimisticLikeCount,
      });
      setStatus(error.message);
      return null;
    } finally {
      likeRequestIdsRef.current.delete(postId);
    }
  }, [feed, loadAnalytics, selectedPost, selectedProfile, syncLikedPost]);

  const handleComment = useCallback(async (body, resetDraft) => {
    if (!currentUser || !selectedPost) return setStatus("Log in and open a post first.");
    try {
      await createComment(selectedPost.id, { user_id: currentUser.id, body });
      resetDraft();
      const items = await refreshFeed({ nextSort: sortBy, nextCategory: category, limit: Math.max(feed.length, 9) });
      await loadAnalytics();
      const updated = items.find((item) => item.id === selectedPost.id) ?? selectedPost;
      await openPost(updated);
      setStatus("Comment published.");
    } catch (error) {
      setStatus(error.message);
    }
  }, [category, currentUser, feed.length, loadAnalytics, openPost, refreshFeed, selectedPost, sortBy]);

  const handleSortChange = useCallback(async (nextSort) => {
    await resetFeed(nextSort, category);
  }, [category, resetFeed]);

  const handleCategoryChange = useCallback(async (nextCategory) => {
    await resetFeed(sortBy, nextCategory);
  }, [resetFeed, sortBy]);

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
    hasMoreFeed,
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
    isAnalyticsLoading,
    isFeedLoading,
    isFeedLoadingMore,
    isOwnProfileRoute,
    isThreadOpen,
    loginForm,
    navigate,
    openHistoryPost,
    openPostById,
    openPost,
    logout,
    loadMoreFeed,
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
    syncVisibleFeedCount,
    users,
    refreshRecommendedCreators,
    goMyProfile,
    goUserPage,
  };
}
