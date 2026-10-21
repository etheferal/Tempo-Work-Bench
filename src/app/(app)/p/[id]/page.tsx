import BoardView from "@/components/board/board-view";

export const metadata = { title: "Board" };

export default async function BoardPage({ params }: { params: { id: string } }) {
  return <BoardView projectId={params.id} />;
}
