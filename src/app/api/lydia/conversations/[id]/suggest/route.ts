import { NextResponse } from "next/server";
import { suggestReply } from "@/lib/lydia-api/client";
import { apiErrorResponse } from "@/lib/lydia-api/api-error";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json(await suggestReply(id));
  } catch (error) {
    return apiErrorResponse(error, "POST /api/lydia/conversations/[id]/suggest");
  }
}
