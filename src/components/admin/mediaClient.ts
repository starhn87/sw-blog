import type { MediaItem } from "./types";

export interface MediaList {
  folders: string[];
  items: MediaItem[];
}

export class MediaApiError extends Error {
  constructor(readonly status: number) {
    super(`Media API request failed with status ${status}`);
    this.name = "MediaApiError";
  }
}

async function mediaRequest(
  password: string,
  init?: RequestInit,
  params?: URLSearchParams,
) {
  const headers = new Headers(init?.headers);
  headers.set("x-admin-password", password);
  const query = params ? `?${params.toString()}` : "";
  const response = await fetch(`/api/media${query}`, { ...init, headers });

  if (!response.ok) {
    throw new MediaApiError(response.status);
  }

  return response;
}

async function sendMediaJson(
  password: string,
  method: "PUT" | "DELETE",
  body: unknown,
) {
  await mediaRequest(password, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function listMedia(password: string, folder = "") {
  const params = new URLSearchParams({ list: "1" });
  if (folder) params.set("folder", folder);
  const response = await mediaRequest(password, undefined, params);
  return (await response.json()) as MediaList;
}

export async function uploadMedia(password: string, formData: FormData) {
  await mediaRequest(password, { method: "POST", body: formData });
}

export async function deleteMedia(
  password: string,
  body: { keys?: string[]; folders?: string[] },
) {
  await sendMediaJson(password, "DELETE", body);
}

export async function renameMediaFile(
  password: string,
  from: string,
  to: string,
) {
  await sendMediaJson(password, "PUT", { renameFile: { from, to } });
}

export async function renameMediaFolder(
  password: string,
  from: string,
  to: string,
) {
  await sendMediaJson(password, "PUT", { renameFolder: { from, to } });
}

export async function saveMediaOrder(
  password: string,
  folder: string,
  order: string[],
) {
  await sendMediaJson(password, "PUT", {
    folder: folder || undefined,
    order,
  });
}
