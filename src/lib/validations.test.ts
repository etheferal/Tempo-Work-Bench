import { describe, expect, it } from "vitest";
import {
  createTaskSchema,
  loginSchema,
  moveTaskSchema,
  registerSchema,
  updateTaskSchema,
} from "./validations";

describe("registerSchema", () => {
  it("accepts valid input and normalizes the email", () => {
    const parsed = registerSchema.parse({ name: "Ada", email: "  ADA@Example.COM ", password: "longenough1" });
    expect(parsed.email).toBe("ada@example.com");
  });

  it("rejects short passwords", () => {
    const result = registerSchema.safeParse({ name: "Ada", email: "a@b.co", password: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = registerSchema.safeParse({ name: "Ada", email: "nope", password: "longenough1" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  it("defaults priority to MEDIUM", () => {
    const parsed = createTaskSchema.parse({ title: "Do the thing" });
    expect(parsed.priority).toBe("MEDIUM");
  });

  it("rejects empty titles", () => {
    expect(createTaskSchema.safeParse({ title: "   " }).success).toBe(false);
  });

  it("rejects unknown priorities", () => {
    expect(createTaskSchema.safeParse({ title: "x", priority: "EXTREME" }).success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("rejects completely empty payloads", () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });

  it("accepts partial updates", () => {
    const parsed = updateTaskSchema.parse({ priority: "URGENT" });
    expect(parsed.priority).toBe("URGENT");
  });

  it("accepts null for clearing a due date", () => {
    const parsed = updateTaskSchema.parse({ dueAt: null });
    expect(parsed.dueAt).toBeNull();
  });
});

describe("moveTaskSchema", () => {
  it("requires a non-negative index", () => {
    expect(moveTaskSchema.safeParse({ columnId: "c1", index: -1 }).success).toBe(false);
    expect(moveTaskSchema.safeParse({ columnId: "c1", index: 0 }).success).toBe(true);
  });
});
