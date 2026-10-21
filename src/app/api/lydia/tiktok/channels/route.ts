import { NextResponse } from "next/server";
import { listTiktokChannels } from "@/lib/lydia-api/client";
import { lydiaErrorResponse } from "@/lib/auth/requireAdmin";

// LYD-95: estado de las cuentas TikTok. Lo leen todas las asesoras (el inbox avisa si hay que reautorizar).
export async function GET() {
  try {
    return NextResponse.json({ channels: await listTiktokChannels() });
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}
