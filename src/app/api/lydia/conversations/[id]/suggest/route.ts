import { NextResponse } from "next/server";
import { suggestReply } from "@/lib/lydia-api/client";
import { friendlyMessage } from "@/lib/lydia-api/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(await suggestReply(id));
  } catch (error) {
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: friendlyMessage(error) }, { status: isConfigError ? 503 : 502 });
  }
}
