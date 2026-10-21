import { Suspense } from "react";
import { CanalesPanel } from "@/components/canales/CanalesPanel";

export default function CanalesPage() {
  return (
    <Suspense>
      <CanalesPanel />
    </Suspense>
  );
}
