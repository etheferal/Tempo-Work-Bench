import WorkspaceContent from "@/components/workspace-content";

export const metadata = { title: "Workspace" };

export default async function WorkspacePage({ params }: { params: { slug: string } }) {
  return <WorkspaceContent slug={params.slug} />;
}
