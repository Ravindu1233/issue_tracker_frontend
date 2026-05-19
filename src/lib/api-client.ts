export type LocalUser = {
  id: string;
  full_name: string;
  email: string;
};

export type Priority = "low" | "medium" | "high";
export type Status = "open" | "in_progress" | "resolved" | "closed";

export type Issue = {
  id: string;
  user_id: string;
  reporterName: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  created_at: string;
  updated_at: string;
};

type ApiUser = {
  id: number | string;
  full_name?: string;
  email: string;
};

type ApiIssue = {
  id: number | string;
  user_id: number | string;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  created_by: string;
  created_at: string;
  updated_at: string;
};

type AuthResponse = {
  token: string;
  user: ApiUser;
};

type IssuesResponse = {
  issues: ApiIssue[];
  pagination: Pagination;
};

export type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type IssueStats = {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
};

type StatsResponse = {
  stats: Array<{ status: ApiIssue["status"]; total: number }>;
  totalIssues: number;
};

export type IssueListParams = {
  search?: string;
  status?: Status | "all";
  priority?: Priority | "all";
  page?: number;
  limit?: number;
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
    full_name: user.full_name ?? user.email.split("@")[0] ?? user.email,
    email: user.email,
  };
}

function toApiPriority(priority: Priority): ApiIssue["priority"] {
  const priorities: Record<Priority, ApiIssue["priority"]> = {
    low: "Low",
    medium: "Medium",
    high: "High",
  };

  return priorities[priority];
}

function toApiStatus(status: Status): ApiIssue["status"] {
  const statuses: Record<Status, ApiIssue["status"]> = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  };

  return statuses[status];
}

function toLocalPriority(priority: ApiIssue["priority"]): Priority {
  return priority.toLowerCase() as Priority;
}

function toLocalStatus(status: ApiIssue["status"]): Status {
  if (status === "In Progress") return "in_progress";
  return status.toLowerCase() as Status;
}

function toLocalIssue(issue: ApiIssue): Issue {
  return {
    id: String(issue.id),
    user_id: String(issue.user_id),
    reporterName: issue.created_by,
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

export async function register(fullName: string, email: string, password: string) {
  const result = await apiRequest<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ full_name: fullName, email, password }),
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

export async function listIssues(params: IssueListParams = {}) {
  const query = new URLSearchParams();

  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));

  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.status && params.status !== "all") {
    query.set("status", toApiStatus(params.status));
  }
  if (params.priority && params.priority !== "all") {
    query.set("priority", toApiPriority(params.priority));
  }

  const data = await apiRequest<IssuesResponse>(`/issues?${query.toString()}`);
  return {
    issues: data.issues.map(toLocalIssue),
    pagination: data.pagination,
  };
}

export async function getIssue(id: string) {
  const data = await apiRequest<{ issue: ApiIssue }>(`/issues/${id}`);
  return toLocalIssue(data.issue);
}

export async function getIssueStats() {
  const data = await apiRequest<StatsResponse>("/issues/stats");
  const stats: IssueStats = {
    total: data.totalIssues,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
  };

  for (const row of data.stats) {
    const key = toLocalStatus(row.status);
    stats[key] = Number(row.total);
  }

  return stats;
}

export async function saveIssue(
  _userId: string,
  draft: Omit<Issue, "id" | "user_id" | "reporterName" | "created_at" | "updated_at">,
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

export async function exportIssues(
  format: "csv" | "json",
  params: Omit<IssueListParams, "page" | "limit"> = {},
) {
  const allIssues: Issue[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await listIssues({ ...params, page, limit: 100 });
    allIssues.push(...data.issues);
    hasNextPage = data.pagination.hasNextPage;
    page += 1;
  }

  if (format === "json") {
    return JSON.stringify(allIssues, null, 2);
  }

  const headers = [
    "id",
    "title",
    "description",
    "priority",
    "status",
    "reporterName",
    "created_at",
    "updated_at",
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = allIssues.map((issue) =>
    headers.map((header) => escape(String(issue[header as keyof Issue] ?? ""))).join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
