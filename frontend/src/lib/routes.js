export const guestProfile = {
  user: { username: "guest", display_name: "Guest Visitor", bio: "" },
  stats: { post_count: 0, total_likes_received: 0, total_comments_received: 0 },
  recent_posts: [],
};

export function parseRoute(pathname) {
  if (pathname === "/create") return { view: "create" };
  if (pathname === "/profile") return { view: "profile" };
  if (pathname === "/history") return { view: "history" };
  if (pathname === "/analytics") return { view: "analytics" };
  if (pathname === "/search") return { view: "search" };
  if (pathname === "/settings") return { view: "settings" };
  if (pathname.startsWith("/users/")) {
    const username = decodeURIComponent(pathname.slice("/users/".length)).trim();
    return username ? { view: "user", username } : { view: "home" };
  }
  return { view: "home" };
}

export function routeToPath(route) {
  if (route.view === "create") return "/create";
  if (route.view === "profile") return "/profile";
  if (route.view === "history") return "/history";
  if (route.view === "analytics") return "/analytics";
  if (route.view === "search") return "/search";
  if (route.view === "settings") return "/settings";
  if (route.view === "user" && route.username) return `/users/${encodeURIComponent(route.username)}`;
  return "/";
}
