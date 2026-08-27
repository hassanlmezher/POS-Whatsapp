import { NextResponse } from "next/server";
import { getTenantContext, tenantContextErrorStatus } from "@/lib/tenant-context";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getTenantContext();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = tenantContextErrorStatus(error);
    return NextResponse.json(
      { ok: false, error: status === 403 ? "missing_membership" : "tenant_context_unavailable" },
      { status },
    );
  }
}
