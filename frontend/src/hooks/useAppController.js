import { useEffect, useState } from "react";
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
  getUserProfile,
  getUsers,
  loginUser,
  logoutUser,
  recordPostView,
  toggleLike,
  updateUser,
} from "../api";
import { blankLogin, blankPost, blankRegistration, blankSettings } from "../lib/constants";
import { guestProfile, parseRoute, routeToPath } from "../lib/routes";

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
  const [commentBody, setCommentBody] = useState("");
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));
  const [browsingHistory, setBrowsingHistory] = useState([]);

  const currentView = route.view === "user" ? "user" : route.view;
  const isOwnProfileRoute = route.view === "profile";
  const activeProfile = isOwnProfileRoute ? (selectedProfile ?? guestProfile) : route.view === "user" ? selectedProfile : null;

  function navigate(nextRoute) {
    const normalized = typeof nextRoute === "string" ? parseRoute(nextRoute) : nextRoute;
    const nextPath = typeof nextRoute === "string" ? nextRoute : routeToPath(normalized);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setRoute(normalized);
  }

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

  async function goUserPage(username) {
    try {
      await loadProfile(username);
      navigate({ view: "user", username });
      setIsThreadOpen(false);
      setStatus(`Viewing @${username}'s salon`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function goMyProfile() {
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
  }

  async function setLoggedInUser(user) {
    setCurrentUser(user);
    setLoginForm({ username: user.username, password: "" });
    setSettingsForm({ display_name: user.display_name, bio: user.bio ?? "", password: "" });
    await loadProfile(user.username);
    await loadHistory(user.username);
  }

  async function handleNavChange(nextView) {
    if (nextView === "profile") {
      await goMyProfile();
      return;
    }
    navigate({ view: nextView });
  }

  async function openPost(post) {
    const comments = await getPostComments(post.id);
    setSelectedPost(post);
    setSelectedComments(comments);
    setIsThreadOpen(true);
    if (currentUser) {
      await recordPostView(post.id, currentUser.id);
      await loadHistory(currentUser.username);
    }
  }

  async function openHistoryPost(postId) {
    try {
      const post = await getPost(postId);
      await openPost(post);
      setStatus("Opened post from history.");
    } catch (error) {
      setStatus(error.message);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([refreshUsers(), refreshFeed("recent", "All"), loadAnalytics()]);
        try {
          const sessionUser = await getCurrentSession();
          await setLoggedInUser(sessionUser);
          setStatus(`Welcome back, ${sessionUser.display_name}.`);
        } catch {
          setStatus("Browse first, then log in when you want to interact.");
        }
      } catch (error) {
        setStatus(error.message);
      }
    }
    bootstrap();
  }, []);

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

  async function handleLogin(event) {
    event.preventDefault();
    try {
      const user = await loginUser(loginForm.username, loginForm.password);
      await setLoggedInUser(user);
      navigate({ view: "home" });
      setStatus(`Welcome back, ${user.display_name}.`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function handleRegister(event) {
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
      navigate({ view: "home" });
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
      if (route.view === "profile" && currentUser?.username) await loadProfile(currentUser.username);
      if (route.view === "user" && route.username) await loadProfile(route.username);
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

  async function handleSortChange(nextSort) {
    setSortBy(nextSort);
    await refreshFeed(nextSort, category);
  }

  async function handleCategoryChange(nextCategory) {
    setCategory(nextCategory);
    await refreshFeed(sortBy, nextCategory);
  }

  async function logout() {
    try {
      await logoutUser();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setCurrentUser(null);
      setSelectedProfile(null);
      setBrowsingHistory([]);
      navigate({ view: "home" });
      setStatus("Logged out.");
    }
  }

  return {
    activeProfile,
    analytics,
    browsingHistory,
    category,
    commentBody,
    currentUser,
    currentView,
    feed,
    feedError,
    handleCategoryChange,
    handleComment,
    handleCreatePost,
    handleLike,
    handleLogin,
    handleNavChange,
    handleRegister,
    handleSortChange,
    handleUpdateProfile,
    isFeedLoading,
    isOwnProfileRoute,
    isThreadOpen,
    loginForm,
    navigate,
    openHistoryPost,
    openPost,
    postForm,
    registration,
    route,
    selectedComments,
    selectedPost,
    setCommentBody,
    setIsThreadOpen,
    setLoginForm,
    setPostForm,
    setRegistration,
    setSettingsForm,
    settingsForm,
    sortBy,
    status,
    users,
    goMyProfile,
    goUserPage,
    setIsThreadOpen,
  };
}

