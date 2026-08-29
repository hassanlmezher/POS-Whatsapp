import { NextResponse } from "next/server";
import { z } from "zod";
import { getMessageAudioStorage } from "@/lib/data/repository";
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
    const audio = await getMessageAudioStorage(parsed.data.messageId);

    if (!audio) {
      return NextResponse.json({ error: "Audio is not available for this message" }, { status: 404 });
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage.from(audio.bucket).download(audio.path);

    if (error || !data) {
      console.error("[api/messages/audio] Storage download failed", {
        messageId: parsed.data.messageId,
        bucket: audio.bucket,
        path: audio.path,
        error,
      });
      return NextResponse.json({ error: "Audio download failed" }, { status: 502 });
    }

    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Type": audio.mimeType ?? data.type ?? "audio/ogg",
    });

    if (audio.fileName) {
      headers.set("Content-Disposition", `inline; filename="${audio.fileName.replace(/"/g, "")}"`);
    }

    return new Response(data, { status: 200, headers });
  } catch (error) {
    console.error("[api/messages/audio] Failed to stream audio", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to stream audio",
      },
      { status: tenantContextErrorStatus(error) },
    );
  }
}
