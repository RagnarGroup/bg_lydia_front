import { redirect } from "next/navigation";

// LYD-84: la antigua "Inbox de correo" (sin uso) se reemplazo por Landing.
export default function InboxCorreoPage() {
  redirect("/comunicaciones/landing");
}
