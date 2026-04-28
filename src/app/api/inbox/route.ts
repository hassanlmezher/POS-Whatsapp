import { NextResponse } from "next/server";
import { getInboxData } from "@/lib/data/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const activeConversationId = url.searchParams.get("activeConversationId") ?? undefined;
  const data = await getInboxData(activeConversationId);

  return NextResponse.json(data);
}
