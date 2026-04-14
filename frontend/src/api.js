const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Request failed");
  }

  return response.json();
}

export function getFeed(sortBy = "recent") {
  return request(`/feed?sort_by=${sortBy}`);
}

export function createUser(payload) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getUsers() {
  return request("/users");
}

export function getUserProfile(username) {
  return request(`/users/${username}`);
}

export function createPost(payload) {
  return request("/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function toggleLike(postId, userId) {
  return request(`/posts/${postId}/like?user_id=${userId}`, {
    method: "POST",
  });
}

export function createComment(postId, payload) {
  return request(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getPostComments(postId) {
  return request(`/posts/${postId}/comments`);
}
