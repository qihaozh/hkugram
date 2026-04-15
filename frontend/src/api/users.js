import { request } from "./client";

export function getUsers() {
  return request("/users");
}

export function createUser(payload) {
  return request("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getUserProfile(username) {
  return request(`/users/${username}`);
}

export function getUserProfileForViewer(username, viewerUserId) {
  const query = new URLSearchParams();
  if (viewerUserId) {
    query.set("viewer_user_id", String(viewerUserId));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return request(`/users/${username}${suffix}`);
}

export function getUserHistory(username) {
  return request(`/users/${username}/history`);
}

export function updateUser(username, payload) {
  return request(`/users/${username}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function toggleFollow(username, followerUserId) {
  return request(`/users/${username}/follow?follower_user_id=${followerUserId}`, {
    method: "POST",
  });
}
