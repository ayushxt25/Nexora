const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("access_token");
}

async function request(path, { method = "GET", body, auth = true, timeout = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message = data?.detail || `Request failed with status ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }

    return data;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Please check your connection and try again.");
    }
    throw err;
  }
}

export const api = {
  register: (username, password) =>
    request("/auth/register", { method: "POST", body: { username, password }, auth: false }),

  login: (username, password) =>
    request("/auth/login", { method: "POST", body: { username, password }, auth: false }),

  generateConversation: (description, interests) =>
    request("/generate-conversation", {
      method: "POST",
      body: { description, interests },
      timeout: 60000,
    }),

  sendFeedback: (suggestion, action) =>
    request("/feedback", { method: "POST", body: { suggestion, action } }),

  factCheck: (query) =>
    request("/fact-check", { method: "POST", body: { query } }),

  getHistory: () => request("/history", { method: "GET" }),

  getFeedbackHistory: () => request("/feedback-history", { method: "GET" }),
};