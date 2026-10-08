import { NextResponse } from "next/server";
import { listAgents } from "@/lib/lydia-api/client";
import { InvalidIdTokenError, verifyGoogleIdToken } from "@/lib/auth/verifyGoogleIdToken";
import { SESSION_COOKIE_NAME, createSessionCookie } from "@/lib/auth/session";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias, igual que el TTL del JWT

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.idToken) {
    return NextResponse.json({ error: "idToken es requerido" }, { status: 400 });
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(body.idToken);
  } catch (error) {
    if (error instanceof InvalidIdTokenError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Error verificando el login" }, { status: 502 });
  }

  let agents;
  try {
    agents = await listAgents();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: message }, { status: isConfigError ? 503 : 502 });
  }

  const agent = agents.find((a) => a.active && a.email?.toLowerCase() === identity.email.toLowerCase());
  if (!agent) {
    return NextResponse.json({ error: "Tu cuenta no esta habilitada en Lydia" }, { status: 403 });
  }

  const token = await createSessionCookie({
    agentId: agent.id,
    email: agent.email ?? identity.email,
    name: agent.name,
    role: agent.role,
  });
  const response = NextResponse.json({
    agent: { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export async function GET() {
  const session = await getCurrentAgent();
  if (!session) {
    return NextResponse.json({ error: "No hay sesion activa" }, { status: 401 });
  }
  return NextResponse.json({
    agent: { id: session.agentId, email: session.email, name: session.name, role: session.role },
  });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
