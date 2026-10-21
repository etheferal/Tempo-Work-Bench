/** Shared domain constants & DTO types. */

export const ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_META: Record<Priority, { label: string; color: string }> = {
  LOW: { label: "Low", color: "#3b82f6" },
  MEDIUM: { label: "Medium", color: "#eab308" },
  HIGH: { label: "High", color: "#f97316" },
  URGENT: { label: "Urgent", color: "#ef4444" },
};

export const PROJECT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
] as const;

export const ACTIVITY_TYPES = [
  "workspace_created",
  "workspace_updated",
  "member_joined",
  "member_left",
  "project_created",
  "project_archived",
  "project_unarchived",
  "task_created",
  "task_completed",
  "task_reopened",
  "task_assigned",
  "task_recreated",
  "comment_added",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const NOTIFICATION_TYPES = ["task_assigned", "comment_added", "member_joined"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// ---------------------------------------------------------------------------
// DTOs (JSON contracts shared between API routes and the client)
// ---------------------------------------------------------------------------

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  role: Role;
  projectsCount: number;
  createdAt: string;
}

export interface MemberRow {
  id: string;
  role: Role;
  user: UserDTO;
  createdAt: string;
}

export interface InviteRow {
  id: string;
  email: string;
  role: Exclude<Role, "OWNER">;
  expiresAt: string;
  createdAt: string;
  token: string;
}

export interface LabelDTO {
  id: string;
  name: string;
  color: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  color: string;
  archivedAt: string | null;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  createdAt: string;
  tasksCount?: number;
  doneCount?: number;
}

export interface BoardTaskDTO {
  id: string;
  title: string;
  order: number;
  priority: Priority;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  assignee: UserDTO | null;
  labels: LabelDTO[];
  commentCount: number;
  checklistCount: number;
  checklistDoneCount: number;
}

export interface BoardColumnDTO {
  id: string;
  name: string;
  order: number;
  isDone: boolean;
  tasks: BoardTaskDTO[];
}

export interface BoardDTO {
  id: string;
  name: string;
  color: string;
  workspace: { id: string; name: string; slug: string };
  role: Role;
  columns: BoardColumnDTO[];
}

export interface ChecklistItemDTO {
  id: string;
  content: string;
  done: boolean;
  order: number;
}

export interface CommentDTO {
  id: string;
  content: string;
  createdAt: string;
  author: UserDTO;
}

export interface AttachmentDTO {
  id: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface TaskDetailDTO extends BoardTaskDTO {
  description: string | null;
  recurrence: string; // NONE | DAILY | WEEKLY | MONTHLY
  projectId: string;
  projectName: string;
  projectColor: string;
  columnId: string;
  columnName: string;
  checklist: ChecklistItemDTO[];
  comments: CommentDTO[];
  attachments: AttachmentDTO[];
  workspaceId: string;
  members: UserDTO[]; // for assignee picker
  labels: LabelDTO[]; // labels attached to this task
  workspaceLabels: LabelDTO[]; // every label in the workspace (for the picker)
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  meta: Record<string, string> | null;
  createdAt: string;
  user: UserDTO;
}

export interface NotificationDTO {
  id: string;
  type: NotificationType;
  meta: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}

export interface OverviewDTO {
  user: UserDTO;
  workspaces: WorkspaceSummary[];
  counts: { activeTasks: number; completedThisWeek: number; overdue: number; projects: number };
  weekly: { date: string; label: string; count: number }[];
  myTasks: {
    id: string;
    title: string;
    priority: Priority;
    dueAt: string | null;
    completedAt: string | null;
    projectId: string;
    projectName: string;
    projectColor: string;
    columnName: string;
  }[];
  priorityBreakdown: { priority: Priority; count: number }[];
  activity: ActivityDTO[];
}
