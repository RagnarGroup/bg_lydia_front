import { NextResponse } from "next/server";
import { getAgentInstructions, setAgentInstructions } from "@/lib/lydia-api/client";
import { lydiaErrorResponse, requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET() {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json(await getAgentInstructions());
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body.instructions !== "string") {
    return NextResponse.json({ error: "instructions es requerido" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await setAgentInstructions({
        instructions: body.instructions,
        updatedBy: auth.session.name,
      }),
    );
  } catch (error) {
    return lydiaErrorResponse(error);
  }
}
