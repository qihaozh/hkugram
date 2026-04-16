import { request } from "./client";

export function compareSearchMethods(query) {
  return request("/query/search-comparison", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}
