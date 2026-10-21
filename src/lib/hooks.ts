"use client";

/**
 * Client data layer — a single place for every API call + React Query hook.
 * Mutations invalidate exactly the caches they affect and the DnD move
 * applies the same `applyMove` logic as the API for optimistic updates.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  ActivityDTO,
  BoardDTO,
  CommentDTO,
  InviteRow,
  LabelDTO,
  MemberRow,
  NotificationDTO,
  OverviewDTO,
  ProjectSummary,
  Role,
  TaskDetailDTO,
  WorkspaceSummary,
} from "./constants";
import type { CreateProjectInput, CreateTaskInput, CreateWorkspaceInput } from "./validations";
import { applyMove } from "./board";

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

export class ApiClientError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new ApiClientError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const post = <T>(url: string, body?: unknown) =>
  api<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
const patch = <T>(url: string, body?: unknown) =>
  api<T>(url, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) });
const del = <T>(url: string) => api<T>(url, { method: "DELETE" });

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const keys = {
  workspaces: ["workspaces"] as const,
  workspacePrefix: ["workspace"] as const,
  workspace: (slug: string) => ["workspace", slug] as const,
  boardPrefix: ["board"] as const,
  board: (projectId: string) => ["board", projectId] as const,
  taskPrefix: ["task"] as const,
  task: (taskId: string) => ["task", taskId] as const,
  overview: ["overview"] as const,
  activity: (workspaceId: string) => ["activity", workspaceId] as const,
  notifications: ["notifications"] as const,
  search: (q: string) => ["search", q] as const,
  invite: (token: string) => ["invite", token] as const,
};

// ---------------------------------------------------------------------------
// Workspace queries
// ---------------------------------------------------------------------------

export function useWorkspaces() {
  return useQuery({
    queryKey: keys.workspaces,
    queryFn: () => api<WorkspaceSummary[]>("/api/workspaces"),
  });
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  myRole: Role;
  members: MemberRow[];
  invites: InviteRow[];
  labels: LabelDTO[];
  projects: ProjectSummary[];
}

export function useWorkspace(slug: string) {
  return useQuery({
    queryKey: keys.workspace(slug),
    queryFn: () => api<WorkspaceDetail>(`/api/workspaces?slug=${encodeURIComponent(slug)}`),
    enabled: !!slug,
  });
}

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => post<WorkspaceSummary>("/api/workspaces", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspaces }),
  });
}

export function useUpdateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateWorkspaceInput>) =>
      patch(`/api/workspaces/${id}`, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.workspaces });
      qc.invalidateQueries({ queryKey: keys.workspacePrefix }); // all slug caches
      qc.invalidateQueries({ queryKey: keys.overview });
      void vars;
    },
  });
}

export function useDeleteWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/workspaces/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.workspaces });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

// --- Members & invites -----------------------------------------------------

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, email, role }: { workspaceId: string; email: string; role: "ADMIN" | "MEMBER" }) =>
      post<InviteRow>(`/api/workspaces/${workspaceId}/invites`, { email, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspacePrefix }),
  });
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, inviteId }: { workspaceId: string; inviteId: string }) =>
      del(`/api/workspaces/${workspaceId}/invites?inviteId=${inviteId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspacePrefix }),
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId, role }: { workspaceId: string; userId: string; role: "ADMIN" | "MEMBER" }) =>
      patch(`/api/workspaces/${workspaceId}/members`, { userId, role }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspacePrefix }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: string; userId: string }) =>
      del(`/api/workspaces/${workspaceId}/members?userId=${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspacePrefix }),
  });
}

export function useInviteInfo(token: string) {
  return useQuery({
    queryKey: keys.invite(token),
    queryFn: () =>
      api<{ workspaceName: string; inviterName: string; role: string; email: string; slug: string }>(
        `/api/invites/${token}`
      ),
    enabled: !!token,
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => post<{ slug: string }>(`/api/invites/${token}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.workspaces });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

// ---------------------------------------------------------------------------
// Project queries
// ---------------------------------------------------------------------------

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, ...input }: CreateProjectInput & { workspaceId: string }) =>
      post<ProjectSummary>(`/api/workspaces/${workspaceId}/projects`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.workspacePrefix });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateProjectInput> & { archived?: boolean }) =>
      patch(`/api/projects/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.workspacePrefix });
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.workspacePrefix });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

// ---------------------------------------------------------------------------
// Board queries
// ---------------------------------------------------------------------------

export function useBoard(projectId: string) {
  return useQuery({
    queryKey: keys.board(projectId),
    queryFn: () => api<BoardDTO>(`/api/projects/${projectId}`),
    enabled: !!projectId,
  });
}

export function useCreateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, name }: { projectId: string; name: string }) =>
      post(`/api/projects/${projectId}/columns`, { name }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.board(vars.projectId) });
    },
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; isDone?: boolean }) =>
      patch(`/api/columns/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => del(`/api/columns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.boardPrefix }),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, ...input }: CreateTaskInput & { projectId: string }) =>
      post(`/api/projects/${projectId}/tasks`, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.board(vars.projectId) });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

/**
 * Optimistic drag & drop move — uses the exact same `applyMove` used by the
 * server, rolls the cache back if the request fails.
 */
export function useMoveTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, columnId, index }: { taskId: string; columnId: string; index: number }) =>
      post(`/api/tasks/${taskId}/move`, { columnId, index }),
    onMutate: async ({ taskId, columnId, index }) => {
      await qc.cancelQueries({ queryKey: keys.board(projectId) });
      const previous = qc.getQueryData<BoardDTO>(keys.board(projectId));
      if (previous) {
        const next = {
          ...previous,
          columns: applyMove(previous.columns, taskId, columnId, index).map((col) => ({
            ...col,
            tasks: col.tasks.map((t) =>
              t.id === taskId
                ? { ...t, completedAt: col.isDone ? t.completedAt ?? new Date().toISOString() : null }
                : t
            ),
          })),
        };
        qc.setQueryData(keys.board(projectId), next);
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.board(projectId), ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.board(projectId) });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => del(`/api/tasks/${taskId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

// ---------------------------------------------------------------------------
// Task detail queries
// ---------------------------------------------------------------------------

export function useTaskDetail(taskId: string | null) {
  return useQuery({
    queryKey: keys.task(taskId ?? ""),
    queryFn: () => api<TaskDetailDTO>(`/api/tasks/${taskId}`),
    enabled: !!taskId,
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<CreateTaskInput>) =>
      patch<TaskDetailDTO>(`/api/tasks/${id}`, input),
    onSuccess: (data, vars) => {
      qc.setQueryData(keys.task(vars.id), data);
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
      qc.invalidateQueries({ queryKey: keys.overview });
    },
  });
}

export function useToggleTaskLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: string; labelId: string }) =>
      post(`/api/tasks/${taskId}/labels`, { labelId }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
    },
  });
}

export function useCreateComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      post<CommentDTO>(`/api/tasks/${taskId}/comments`, { content }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
    },
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, content }: { taskId: string; content: string }) =>
      post(`/api/tasks/${taskId}/checklist`, { content }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
    },
  });
}

export function useUpdateChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...input }: { itemId: string; done?: boolean; content?: string }) =>
      patch(`/api/checklist/${itemId}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.taskPrefix });
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
    },
  });
}

export function useDeleteChecklistItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => del(`/api/checklist/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.taskPrefix });
      qc.invalidateQueries({ queryKey: keys.boardPrefix });
    },
  });
}

// --- Attachments -------------------------------------------------------------

/** Upload uses multipart, so it can't go through the JSON api() helper. */
export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, file }: { taskId: string; file: File }) => {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new ApiClientError(err.error ?? "Upload failed", res.status);
      }
      return (await res.json()) as import("./constants").AttachmentDTO;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: keys.task(vars.taskId) });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, attachmentId }: { taskId: string; attachmentId: string }) =>
      del(`/api/tasks/${taskId}/attachments?attachmentId=${attachmentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.taskPrefix });
    },
  });
}

// --- Labels ------------------------------------------------------------------

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, name, color }: { workspaceId: string; name: string; color: string }) =>
      post<LabelDTO>(`/api/workspaces/${workspaceId}/labels`, { name, color }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.workspacePrefix }),
  });
}

// ---------------------------------------------------------------------------
// Activity, notifications, overview, search
// ---------------------------------------------------------------------------

export function useActivity(workspaceId: string | null) {
  return useQuery({
    queryKey: keys.activity(workspaceId ?? ""),
    queryFn: () => api<ActivityDTO[]>(`/api/workspaces/${workspaceId}/activity`),
    enabled: !!workspaceId,
  });
}

export interface NotificationsPayload {
  notifications: NotificationDTO[];
  unreadCount: number;
}

export function useNotifications() {
  return useQuery({
    queryKey: keys.notifications,
    queryFn: () => api<NotificationsPayload>("/api/notifications"),
  });
}

export function useMarkNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, all }: { id?: string; all?: boolean }) =>
      patch("/api/notifications", { id, all }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

export function useOverview() {
  return useQuery({
    queryKey: keys.overview,
    queryFn: () => api<OverviewDTO>("/api/overview"),
  });
}

export interface SearchResults {
  workspaces: { id: string; name: string; slug: string }[];
  projects: ProjectSummary[];
  tasks: { id: string; title: string; projectId: string; projectName: string }[];
}

export function useSearch(q: string) {
  return useQuery({
    queryKey: keys.search(q),
    queryFn: () => api<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  });
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------

export function useUpdateAccount() {
  return useMutation({
    mutationFn: (input: {
      name?: string;
      image?: string | null;
      currentPassword?: string;
      newPassword?: string;
    }) => patch("/api/account", input),
  });
}
