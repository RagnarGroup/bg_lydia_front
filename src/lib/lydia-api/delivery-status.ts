// LYD-121: estado de entrega de un mensaje saliente a partir de los estados que
// manda Meta (MessageUpdate). Llegan sin orden y a veces repetidos o fuera de
// secuencia (READ antes que DELIVERED), asi que gana el de mayor rango.
export type DeliveryStatus = "sent" | "delivered" | "read";

const RANK: Record<DeliveryStatus, number> = { sent: 0, delivered: 1, read: 2 };

function fromRaw(status: string): DeliveryStatus {
  const s = status.toUpperCase();
  if (s === "READ" || s === "PLAYED") return "read";
  if (s === "DELIVERED" || s === "DELIVERY_ACK") return "delivered";
  return "sent";
}

export function deliveryStatus(updates: { status: string }[] | undefined): DeliveryStatus {
  let best: DeliveryStatus = "sent";
  for (const update of updates ?? []) {
    const current = fromRaw(update.status ?? "");
    if (RANK[current] > RANK[best]) best = current;
  }
  return best;
}
