import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessageAttachmentStorage } from "@/lib/data/repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const paramsSchema = z.object({
  messageId: z.string().uuid(),
});

export async function GET(_request: Request, context: { params: Promise<{ messageId: string }> }) {
  const parsed = paramsSchema.safeParse(await context.params);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid message id" }, { status: 400 });
  }

  try {
    const attachment = await getMessageAttachmentStorage(parsed.data.messageId);

    if (!attachment) {
      return NextResponse.json({ error: "Attachment is not available for this message" }, { status: 404 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(attachment.bucket).download(attachment.path);

    if (error || !data) {
      console.error("[api/messages/attachment] Storage download failed", {
        messageId: parsed.data.messageId,
        bucket: attachment.bucket,
        path: attachment.path,
        error,
      });
      return NextResponse.json({ error: "Attachment download failed" }, { status: 502 });
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": attachment.mimeType ?? data.type ?? "application/octet-stream",
    });

    if (attachment.fileName) {
      const disposition = attachment.messageType === "image" ? "inline" : "attachment";
      headers.set("Content-Disposition", `${disposition}; filename="${attachment.fileName.replace(/"/g, "")}"`);
    }

    return new Response(data, { status: 200, headers });
  } catch (error) {
    console.error("[api/messages/attachment] Failed to stream attachment", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to stream attachment",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
