import { notFound } from "next/navigation";
import { TOOLS } from "../tools";
import { ToolView } from "./ToolView";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/tools/[tool]">) {
  const { tool } = await params;
  const t = TOOLS.find((x) => x.id === tool);
  return { title: t?.name ?? "Outil" };
}

export default async function ToolPage({ params }: PageProps<"/tools/[tool]">) {
  const { tool } = await params;
  const t = TOOLS.find((x) => x.id === tool);
  if (!t) notFound();
  return <ToolView tool={t.id} name={t.name} description={t.description} emoji={t.emoji} />;
}
