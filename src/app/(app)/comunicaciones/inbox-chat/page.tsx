import { InboxView } from "@/components/inbox/InboxView";

// LYD-102: ?chat=<id> abre esa conversacion directo (enlaces del reporte
// diario de auditoria comercial).
export default async function InboxChatPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { chat } = await searchParams;
  return <InboxView initialChatId={typeof chat === "string" ? chat : null} />;
}
