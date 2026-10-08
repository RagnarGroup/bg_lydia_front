import type { IncomingRequest } from "@/lib/types";
import { formatLeadCardDate } from "@/lib/format";
import { ContactAvatar } from "@/components/ContactAvatar";

interface Props {
  request: IncomingRequest;
}

export function IncomingRequestCard({ request }: Props) {
  return (
    <div className="flex items-start gap-2.5 border-b border-line-soft px-3 py-2.5 hover:bg-bg-subtle">
      <div className="relative shrink-0">
        <ContactAvatar seed={request.id} className="h-8 w-8" />
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-success" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] text-muted">de: Brittany Group</p>
            <p className="truncate text-sm font-semibold text-ink">{request.contactName}</p>
          </div>
          <span className="shrink-0 text-xs text-muted">{formatLeadCardDate(request.receivedAt)}</span>
        </div>

        {request.tag && (
          <span className="mt-1 inline-flex items-center gap-1 rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand">
            💬 {request.tag}
          </span>
        )}
        {!request.tag && request.preview && <p className="mt-1 truncate text-xs text-ink-soft">{request.preview}</p>}
      </div>
    </div>
  );
}
