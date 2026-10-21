/**
 * Tempo seed script — populates the database with realistic demo data.
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays, subHours } from "date-fns";

const prisma = new PrismaClient();

const PASSWORD = "demo1234"; // demo account password (see README)

async function hash(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding Tempo database…");

  // --- Clean slate (FK order matters) ---
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.taskLabel.deleteMany();
  await prisma.task.deleteMany();
  await prisma.label.deleteMany();
  await prisma.column.deleteMany();
  await prisma.project.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.member.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // --- Users ---
  const pwHash = await hash(PASSWORD);
  const [demo, alice, bob] = await Promise.all([
    prisma.user.create({
      data: { name: "Demo User", email: "demo@tempo.app", passwordHash: pwHash },
    }),
    prisma.user.create({
      data: { name: "Alice Yıldız", email: "alice@tempo.app", passwordHash: pwHash },
    }),
    prisma.user.create({
      data: { name: "Bob Kaya", email: "bob@tempo.app", passwordHash: pwHash },
    }),
  ]);

  // --- Workspaces & members ---
  const acme = await prisma.workspace.create({
    data: {
      name: "Acme Inc",
      slug: "acme-inc",
      description: "Product team workspace — website & mobile.",
      ownerId: demo.id,
      members: {
        create: [
          { userId: demo.id, role: "OWNER" },
          { userId: alice.id, role: "ADMIN" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  const side = await prisma.workspace.create({
    data: {
      name: "Side Projects",
      slug: "side-projects",
      description: "Weekend experiments and marketing pushes.",
      ownerId: demo.id,
      members: { create: [{ userId: demo.id, role: "OWNER" }] },
    },
  });

  // --- Labels ---
  const labelBug = await prisma.label.create({
    data: { name: "Bug", color: "#ef4444", workspaceId: acme.id },
  });
  const labelDesign = await prisma.label.create({
    data: { name: "Design", color: "#8b5cf6", workspaceId: acme.id },
  });
  const labelFeature = await prisma.label.create({
    data: { name: "Feature", color: "#10b981", workspaceId: acme.id },
  });
  const labelResearch = await prisma.label.create({
    data: { name: "Research", color: "#f59e0b", workspaceId: acme.id },
  });

  // --- Projects & boards ---
  async function createBoard(name: string, color: string, wsId: string, columns: { name: string; isDone?: boolean }[]) {
    const project = await prisma.project.create({
      data: { name, color, workspaceId: wsId },
    });
    const created: string[] = [];
    for (let i = 0; i < columns.length; i++) {
      const col = await prisma.column.create({
        data: { name: columns[i].name, order: i, isDone: columns[i].isDone ?? false, projectId: project.id },
      });
      created.push(col.id);
    }
    return { project, columnIds: created };
  }

  const { project: p1, columnIds: c1 } = await createBoard("Website Redesign", "#6366f1", acme.id, [
    { name: "Backlog" },
    { name: "In Progress" },
    { name: "Review" },
    { name: "Done", isDone: true },
  ]);
  const { project: p2, columnIds: c2 } = await createBoard("Mobile App", "#10b981", acme.id, [
    { name: "Backlog" },
    { name: "In Progress" },
    { name: "Done", isDone: true },
  ]);
  const { project: p3, columnIds: c3 } = await createBoard("Q1 Marketing", "#f59e0b", side.id, [
    { name: "To Do" },
    { name: "In Progress" },
    { name: "Done", isDone: true },
  ]);

  const t = (projectId: string, columnId: string, order: number) => ({
    projectId,
    columnId,
    order,
    createdById: demo.id,
  });

  // --- Tasks: Website Redesign ---
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        ...t(p1.id, c1[0], 0),
        title: "Research competitor landing pages",
        description:
          "Collect 5–10 landing pages we like and summarize **what works**:\n\n- hero copy style\n- pricing layout\n- social proof placement",
        priority: "MEDIUM",
        dueAt: addDays(new Date(), 3),
        assigneeId: bob.id,
        labels: { create: [{ labelId: labelResearch.id }] },
      },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[0], 1),
        title: "Design new pricing page",
        priority: "HIGH",
        dueAt: addDays(new Date(), 5),
        assigneeId: alice.id,
        labels: { create: [{ labelId: labelDesign.id }] },
      },
    }),
    prisma.task.create({
      data: { ...t(p1.id, c1[0], 2), title: "Set up analytics events", priority: "MEDIUM" },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[1], 0),
        title: "Implement responsive navigation",
        description:
          "Breakpoints: `sm`, `md`, `lg`.\n\n- [x] Desktop nav\n- [ ] Mobile drawer\n- [ ] Keyboard support",
        priority: "HIGH",
        dueAt: addDays(new Date(), 1),
        assigneeId: alice.id,
        labels: { create: [{ labelId: labelFeature.id }] },
      },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[1], 1),
        title: "Refactor design tokens",
        priority: "MEDIUM",
        assigneeId: demo.id,
        labels: { create: [{ labelId: labelDesign.id }] },
      },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[2], 0),
        title: "Accessibility audit — home page",
        priority: "URGENT",
        dueAt: subDays(new Date(), 1), // overdue
        assigneeId: bob.id,
      },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[3], 0),
        title: "Migrate blog to MDX",
        priority: "MEDIUM",
        completedAt: subDays(new Date(), 1),
      },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[3], 1),
        title: "Wire up contact form",
        priority: "HIGH",
        completedAt: subDays(new Date(), 2),
        assigneeId: alice.id,
      },
    }),
    prisma.task.create({
      data: {
        ...t(p1.id, c1[3], 2),
        title: "Kickoff meeting notes",
        priority: "LOW",
        completedAt: subDays(new Date(), 5),
      },
    }),

    // --- Tasks: Mobile App ---
    prisma.task.create({
      data: {
        ...t(p2.id, c2[0], 0),
        title: "Prototype onboarding flow",
        priority: "HIGH",
        dueAt: addDays(new Date(), 7),
        assigneeId: alice.id,
      },
    }),
    prisma.task.create({
      data: { ...t(p2.id, c2[0], 1), title: "Fix crash on cold start", priority: "URGENT", labels: { create: [{ labelId: labelBug.id }] } },
    }),
    prisma.task.create({
      data: {
        ...t(p2.id, c2[1], 0),
        title: "Push notifications spike",
        priority: "MEDIUM",
        dueAt: addDays(new Date(), 2),
        assigneeId: bob.id,
      },
    }),
    prisma.task.create({
      data: { ...t(p2.id, c2[2], 0), title: "App icon decision", priority: "LOW", completedAt: subDays(new Date(), 1) },
    }),

    // --- Tasks: Q1 Marketing ---
    prisma.task.create({
      data: { ...t(p3.id, c3[0], 0), title: "Draft launch email", priority: "HIGH", dueAt: addDays(new Date(), 4) },
    }),
    prisma.task.create({
      data: { ...t(p3.id, c3[1], 0), title: "Prepare social assets", priority: "MEDIUM", dueAt: addDays(new Date(), 1) },
    }),
    prisma.task.create({
      data: { ...t(p3.id, c3[2], 0), title: "Publish blog post #1", priority: "MEDIUM", completedAt: subDays(new Date(), 3) },
    }),
  ]);

  // --- Checklist items ---
  const navTask = tasks[3];
  await prisma.checklistItem.createMany({
    data: [
      { taskId: navTask.id, content: "Desktop navigation", done: true, order: 0 },
      { taskId: navTask.id, content: "Mobile drawer", done: false, order: 1 },
      { taskId: navTask.id, content: "Keyboard navigation", done: false, order: 2 },
    ],
  });

  // --- Comments ---
  const auditTask = tasks[5];
  await prisma.comment.createMany({
    data: [
      {
        taskId: navTask.id,
        authorId: bob.id,
        content: "Heads up — the drawer animation drops frames on mid-range Android.",
      },
      { taskId: auditTask.id, authorId: alice.id, content: "I can start on this after the pricing page review." },
    ],
  });

  // --- Activities ---
  await prisma.activity.createMany({
    data: [
      {
        type: "workspace_created",
        userId: demo.id,
        workspaceId: acme.id,
        meta: JSON.stringify({ workspaceName: "Acme Inc" }),
        createdAt: subDays(new Date(), 10),
      },
      {
        type: "member_joined",
        userId: alice.id,
        workspaceId: acme.id,
        meta: JSON.stringify({ memberName: "Alice Yıldız" }),
        createdAt: subDays(new Date(), 9),
      },
      {
        type: "project_created",
        userId: demo.id,
        workspaceId: acme.id,
        projectId: p1.id,
        meta: JSON.stringify({ projectName: "Website Redesign" }),
        createdAt: subDays(new Date(), 8),
      },
      {
        type: "task_completed",
        userId: demo.id,
        workspaceId: acme.id,
        projectId: p1.id,
        taskId: tasks[6].id,
        meta: JSON.stringify({ taskTitle: "Migrate blog to MDX", projectName: "Website Redesign" }),
        createdAt: subDays(new Date(), 1),
      },
      {
        type: "task_created",
        userId: alice.id,
        workspaceId: acme.id,
        projectId: p1.id,
        taskId: tasks[5].id,
        meta: JSON.stringify({ taskTitle: "Accessibility audit — home page", projectName: "Website Redesign" }),
        createdAt: subHours(new Date(), 20),
      },
    ],
  });

  // --- Notifications ---
  await prisma.notification.createMany({
    data: [
      {
        type: "task_assigned",
        userId: bob.id,
        meta: JSON.stringify({
          taskId: tasks[5].id,
          projectId: p1.id,
          actorName: "Alice Yıldız",
          taskTitle: "Accessibility audit — home page",
        }),
        createdAt: subHours(new Date(), 20),
      },
      {
        type: "comment_added",
        userId: alice.id,
        meta: JSON.stringify({
          taskId: navTask.id,
          projectId: p1.id,
          actorName: "Bob Kaya",
          taskTitle: "Implement responsive navigation",
        }),
        createdAt: subHours(new Date(), 6),
      },
    ],
  });

  console.log("Seed complete ✔");
  console.log(`  Demo login → demo@tempo.app / ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
