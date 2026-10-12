import type { InboxChannel } from "@/lib/lydia-api/inbox-types";
import { CHANNEL_META } from "@/lib/lydia-api/channel";

interface Props {
  channel: InboxChannel;
  // Tamaño en px del logo (o del punto, si el canal no tiene logo).
  size?: number;
  className?: string;
}

// LYD-78: logo real del canal (WhatsApp, Facebook, TikTok) en vez del punto
// de color, que no se distinguia bien entre canales. Sin logo, cae al punto.
export function ChannelBadge({ channel, size = 18, className = "" }: Props) {
  const meta = CHANNEL_META[channel];

  if (!meta.icon) {
    return (
      <span
        title={meta.label}
        className={`inline-block shrink-0 rounded-full ${className}`}
        style={{ backgroundColor: meta.color, width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- PNG local chico, next/image no aporta nada aca
    <img
      src={meta.icon}
      alt={meta.label}
      title={meta.label}
      width={size}
      height={size}
      className={`shrink-0 rounded-full ${className}`}
    />
  );
}
