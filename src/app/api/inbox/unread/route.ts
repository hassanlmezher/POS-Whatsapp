import { NextResponse } from "next/server";
import { getUnreadInboxCount } from "@/lib/data/repository";
import { tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const unreadConversationCount = await getUnreadInboxCount();

    return NextResponse.json({ unreadConversationCount });
  } catch (error) {
    console.error("[api/inbox/unread] Failed to load unread inbox count", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load unread inbox count",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
