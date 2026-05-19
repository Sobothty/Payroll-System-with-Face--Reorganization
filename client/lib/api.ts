"use client";

import { getToken } from "@/lib/auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.auth !== false) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await response.json().catch(() => null);
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : typeof data?.message === "string"
            ? data.message
            : JSON.stringify(data);
      throw new Error(detail || "Request failed");
    }
    const text = await response.text();
    throw new Error(text || "Request failed");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<T>;
  }
  return response.blob() as Promise<T>;
}

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export async function downloadWithAuth(path: string, filename: string) {
  const blob = await apiFetch<Blob>(path, { headers: {}, auth: true });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
