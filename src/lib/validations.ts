import { z } from "zod";
import { PRIORITIES, ROLES } from "./constants";
import { RECURRENCES } from "./recurrence";

// --- Auth ---
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Account ---
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  image: z.string().trim().url("Enter a valid URL").max(300).nullable().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(72),
});

// --- Workspaces ---
export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50),
  description: z.string().trim().max(200).optional().nullable(),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

export const memberUpdateSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "MEMBER"]),
});

// --- Projects & columns ---
export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().trim().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Pick a color")
    .default("#6366f1"),
});
// Input type: `color` is optional (schema applies the default on parse)
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const createColumnSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
});
export const updateColumnSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    isDone: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.isDone !== undefined, { message: "Nothing to update" });

// --- Tasks ---
export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(140),
  priority: z.enum(PRIORITIES).default("MEDIUM"),
  recurrence: z.enum(RECURRENCES).default("NONE"),
  description: z.string().max(4000).optional().nullable(),
  assigneeId: z.string().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
});
// Input type: `priority`/`recurrence` are optional (schema applies defaults on parse)
export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().max(4000).nullable().optional(),
    priority: z.enum(PRIORITIES).optional(),
    recurrence: z.enum(RECURRENCES).optional(),
    assigneeId: z.string().nullable().optional(),
    dueAt: z.string().datetime().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Nothing to update" });

export const moveTaskSchema = z.object({
  columnId: z.string().min(1),
  index: z.number().int().min(0),
});

export const taskLabelToggleSchema = z.object({ labelId: z.string().min(1) });

// --- Comments & checklist ---
export const commentSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(2000),
});

export const checklistCreateSchema = z.object({
  content: z.string().trim().min(1, "Write something first").max(200),
});

export const checklistUpdateSchema = z.object({
  done: z.boolean().optional(),
  content: z.string().trim().min(1).max(200).optional(),
});

// --- Labels ---
export const labelSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(24),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#6366f1"),
});

export const roleEnum = z.enum(ROLES);
