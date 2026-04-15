import { buildApiUrl, request, requestWithoutJson } from "./client";

export function getFeed(sortBy = "recent", category, options = {}) {
  const { limit = 9, offset = 0 } = options;
  const query = new URLSearchParams({ sort_by: sortBy });
  if (category && category !== "All") {
    query.set("category", category);
  }
  query.set("limit", String(limit));
  query.set("offset", String(offset));
  return request(`/feed?${query.toString()}`);
}

export function getPost(postId) {
  return request(`/posts/${postId}`);
}

export function getPostComments(postId) {
  return request(`/posts/${postId}/comments`);
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

export async function recordPostView(postId, userId) {
  await requestWithoutJson(`/posts/${postId}/views?user_id=${userId}`, { method: "POST" }, "Failed to record view");
}

export async function createUploadedPost({ userId, category, description, imageFile }) {
  const form = new FormData();
  form.append("user_id", String(userId));
  form.append("category", category);
  form.append("description", description);
  form.append("image", imageFile);

  const response = await fetch(buildApiUrl("/posts/upload"), {
    method: "POST",
    credentials: "include",
    body: form,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Upload failed");
  }

  return response.json();
}

export function createUrlPost({ userId, category, description, imageUrl }) {
  return request("/posts", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      category,
      description,
      image_url: imageUrl,
    }),
  });
}
