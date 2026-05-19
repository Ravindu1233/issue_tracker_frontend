export type LocalUser = {
  id: string;
  email: string;
};

export type Priority = "low" | "medium" | "high";
export type Status = "open" | "in_progress" | "resolved";

export type Issue = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;
};

type ApiUser = {
  id: number | string;
  email: string;
};

type ApiIssue = {
  id: number | string;
  user_id: number | string;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  created_at: string;
  updated_at: string;
};

type AuthResponse = {
  token: string;
  user: ApiUser;
};

type IssuesResponse = {
  issues: ApiIssue[];
};

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "http://localhost:5000/api";
const TOKEN_KEY = "tracely_auth_token";
const CURRENT_USER_KEY = "tracely_current_user";

const isBrowser = () => typeof window !== "undefined";

function getToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setSession(token: string, user: LocalUser) {
  if (!isBrowser()) return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(CURRENT_USER_KEY);
}

function toLocalUser(user: ApiUser): LocalUser {
  return {
    id: String(user.id),
    email: user.email,
  };
}

function toApiPriority(priority: Priority): ApiIssue["priority"] {
  return {
    low: "Low",
    medium: "Medium",
    high: "High",
  }[priority];
}

function toApiStatus(status: Status): ApiIssue["status"] {
  return {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
  }[status];
}

function toLocalPriority(priority: ApiIssue["priority"]): Priority {
  return priority.toLowerCase() as Priority;
}

function toLocalStatus(status: ApiIssue["status"]): Status {
  if (status === "In Progress") return "in_progress";
  if (status === "Closed") return "resolved";
  return status.toLowerCase() as Status;
}

function toLocalIssue(issue: ApiIssue): Issue {
  return {
    id: String(issue.id),
    user_id: String(issue.user_id),
    title: issue.title,
    description: issue.description ?? "",
    priority: toLocalPriority(issue.priority),
    status: toLocalStatus(issue.status),
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = getToken();
    if (!token) throw new Error("Please sign in again");
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const message =
      data?.errors?.[0] ?? data?.message ?? "The server could not complete the request";
    throw new Error(message);
  }

  return data as T;
}

export function getCurrentUser() {
  if (!isBrowser()) return null;

  try {
    const value = window.localStorage.getItem(CURRENT_USER_KEY);
    return value ? (JSON.parse(value) as LocalUser) : null;
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string) {
  const result = await apiRequest<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );

  const user = toLocalUser(result.user);
  setSession(result.token, user);
  return user;
}

export async function register(email: string, password: string) {
  const result = await apiRequest<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false,
  );

  const user = toLocalUser(result.user);
  setSession(result.token, user);
  return user;
}

export async function requestPasswordResetOtp(email: string) {
  await apiRequest<{ message: string }>(
    "/auth/forgot-password",
    {
      method: "POST",
      body: JSON.stringify({ email }),
    },
    false,
  );
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  await apiRequest<{ message: string }>(
    "/auth/verify-otp",
    {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    },
    false,
  );
}

export async function resetPassword(email: string, otp: string, password: string) {
  await apiRequest<{ message: string }>(
    "/auth/reset-password",
    {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
    },
    false,
  );
}

export function signOut() {
  clearSession();
}

export async function listIssues(_userId: string) {
  const data = await apiRequest<IssuesResponse>("/issues?limit=100");
  return data.issues.map(toLocalIssue);
}

export async function saveIssue(
  _userId: string,
  draft: Omit<Issue, "id" | "user_id" | "created_at" | "updated_at">,
  id?: string,
) {
  const body = JSON.stringify({
    title: draft.title,
    description: draft.description,
    priority: toApiPriority(draft.priority),
    status: toApiStatus(draft.status),
  });

  await apiRequest(id ? `/issues/${id}` : "/issues", {
    method: id ? "PUT" : "POST",
    body,
  });
}

export async function deleteIssue(_userId: string, id: string) {
  await apiRequest(`/issues/${id}`, {
    method: "DELETE",
  });
}
