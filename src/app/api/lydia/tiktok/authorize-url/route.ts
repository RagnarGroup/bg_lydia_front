import { NextResponse } from "next/server";
import { getTiktokAuthorizeUrl } from "@/lib/lydia-api/client";
import { lydiaErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";

// LYD-95: solo administradores conectan o reautorizan cuentas.
export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(await getTiktokAuthorizeUrl());
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}
