import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TaskCard from "./task-card";
import type { BoardTaskDTO } from "@/lib/constants";

const baseTask: BoardTaskDTO = {
  id: "t1",
  title: "Research competitor landing pages",
  order: 0,
  priority: "MEDIUM",
  dueAt: null,
  completedAt: null,
  createdAt: new Date().toISOString(),
  assignee: null,
  labels: [{ id: "l1", name: "Research", color: "#f59e0b" }],
  commentCount: 2,
  checklistCount: 3,
  checklistDoneCount: 1,
};

describe("TaskCard", () => {
  it("renders the title and label chips", () => {
    render(<TaskCard task={baseTask} columnId="c1" />);

    expect(screen.getByTestId("task-card")).toHaveTextContent("Research competitor landing pages");
    expect(screen.getByTestId("task-card")).toHaveTextContent("Research");
  });

  it("shows comment and checklist counts", () => {
    render(<TaskCard task={baseTask} columnId="c1" />);

    expect(screen.getByTestId("task-card")).toHaveTextContent("1/3");
    expect(screen.getByTestId("task-card")).toHaveTextContent("2");
  });

  it("shows an overdue badge for past due dates", () => {
    const task = {
      ...baseTask,
      dueAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    };
    render(<TaskCard task={task} columnId="c1" />);

    const badge = screen.getByTestId("due-badge");
    expect(badge).toBeInTheDocument();
  });

  it("does not show a due badge without a due date", () => {
    render(<TaskCard task={baseTask} columnId="c1" />);
    expect(screen.queryByTestId("due-badge")).not.toBeInTheDocument();
  });

  it("opens the task when clicked", async () => {
    const onOpen = vi.fn();
    render(<TaskCard task={baseTask} columnId="c1" onOpen={onOpen} />);

    await userEvent.click(screen.getByTestId("task-card"));
    expect(onOpen).toHaveBeenCalledWith("t1");
  });
});
