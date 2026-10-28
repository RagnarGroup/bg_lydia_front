import { NavRail } from "@/components/NavRail";
import { ReplyDeadlineToasts } from "@/components/alerts/ReplyDeadlineToasts";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg text-ink">
      <NavRail />
      {children}
      {/* LYD-118: avisos de lead sin respuesta, en cualquier seccion. */}
      <ReplyDeadlineToasts />
    </div>
  );
}
