import { NextResponse } from "next/server";
import { getInboxData } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

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
      { status: 500 },
    );
  }
}
