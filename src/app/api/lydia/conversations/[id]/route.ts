import { NextResponse } from "next/server";
import {
  archiveConversation,
  assignConversation,
  deleteConversation,
  markConversationRead,
  updateAgentTags,
  updateConversationContact,
} from "@/lib/lydia-api/client";
import { adaptConversation } from "@/lib/lydia-api/adapters";
import { getCurrentAgent } from "@/lib/auth/getCurrentAgent";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const hasAssignedAgentId = "assignedAgentId" in (body ?? {});
  const hasUnreadMessages = "unreadMessages" in (body ?? {});
  const hasContactOverride = "contactNameOverride" in (body ?? {}) || "contactPhoneOverride" in (body ?? {});
  const hasArchived = "archived" in (body ?? {});
  const hasAgentTags = "agentTags" in (body ?? {});

  if (!hasAssignedAgentId && !hasUnreadMessages && !hasContactOverride && !hasArchived && !hasAgentTags) {
    return NextResponse.json(
      {
        error:
          "assignedAgentId, unreadMessages, contactNameOverride/contactPhoneOverride, archived o agentTags es requerido",
      },
      { status: 400 },
    );
  }

  try {
    let conversation;
    if (hasAgentTags) {
      conversation = await updateAgentTags(id, body.agentTags ?? {});
    } else if (hasArchived) {
      conversation = await archiveConversation(id, body.archived);
    } else if (hasContactOverride) {
      conversation = await updateConversationContact(id, {
        contactNameOverride: body.contactNameOverride,
        contactPhoneOverride: body.contactPhoneOverride,
      });
    } else if (hasUnreadMessages) {
      conversation = await markConversationRead(id);
    } else {
      conversation = await assignConversation(id, body.assignedAgentId);
    }
    return NextResponse.json({ conversation: adaptConversation(conversation) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: message }, { status: isConfigError ? 503 : 502 });
  }
}

// LYD-40: borrado real, irreversible -- restringido a administrador. El
// chequeo de rol se hace aca (server-side, contra la sesion firmada), no
// solo escondiendo el boton en el cliente -- cualquiera podria llamar este
// endpoint a mano sin eso.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await getCurrentAgent();
  if (!session) {
    return NextResponse.json({ error: "No hay sesion activa" }, { status: 401 });
  }
  if (session.role !== "administrador") {
    return NextResponse.json({ error: "Solo un administrador puede eliminar una conversacion" }, { status: 403 });
  }

  try {
    await deleteConversation(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const isConfigError = error instanceof Error && error.name === "LydiaApiConfigError";
    return NextResponse.json({ error: message }, { status: isConfigError ? 503 : 502 });
  }
}
