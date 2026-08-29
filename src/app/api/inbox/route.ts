import { NextResponse } from "next/server";
import { z } from "zod";
import { getInboxData, markConversationRead } from "@/lib/data/repository";
import { tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

const markReadSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const activeConversationId = url.searchParams.get("activeConversationId") ?? undefined;
    const data = await getInboxData(activeConversationId);

    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/inbox] Failed to load inbox data", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load inbox data",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  const parsed = markReadSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid mark-read payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const result = await markConversationRead(parsed.data.conversationId);

    if (!result) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/inbox] Failed to mark conversation read", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to mark conversation read",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
