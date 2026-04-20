import { request } from "./client";

export function draftAgentQuery(prompt) {
  return request("/agent/draft", {
    method: "POST",
    body: JSON.stringify({ prompt }),
  });
}

export function executeAgentQuery({ sql, prompt }) {
  return request("/agent/execute", {
    method: "POST",
    body: JSON.stringify({ sql, prompt }),
  });
}
