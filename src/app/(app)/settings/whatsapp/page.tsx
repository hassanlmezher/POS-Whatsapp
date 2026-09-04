import { redirect } from "next/navigation";
import { MessageCircle, ShieldCheck } from "lucide-react";
import { saveWhatsAppConnection } from "@/app/(app)/settings/whatsapp/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant-context";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ updated?: string; error?: string }> };

function hasSettingsManage(metadata: unknown, tenantId: string) {
  if (!metadata || typeof metadata !== "object") return false;
  const claims = metadata as { permissions?: unknown; tenant_id?: unknown };
  return claims.tenant_id === tenantId && Array.isArray(claims.permissions) && claims.permissions.includes("settings:manage");
}

export default async function WhatsAppSettingsPage({ searchParams }: PageProps) {
  const [{ membership, tenant, user }, params] = await Promise.all([getTenantContext(), searchParams]);
  if (membership.role !== "owner" && !hasSettingsManage(user.app_metadata, tenant.id)) redirect("/login");

  const supabase = createSupabaseAdminClient();
  const { data: connection, error } = await supabase
    .from("whatsapp_connections")
    .select("phone_number_id,waba_id,phone_number,status,updated_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ phone_number_id: string; waba_id: string; phone_number: string | null; status: string; updated_at: string }>();

  if (error) throw new Error(error.message);

  const appId = process.env.NEXT_PUBLIC_WHATSAPP_APP_ID ?? process.env.NEXT_PUBLIC_META_APP_ID ?? "";
  const configId = process.env.NEXT_PUBLIC_WHATSAPP_CONFIGURATION_ID ?? process.env.NEXT_PUBLIC_META_CONFIGURATION_ID ?? "";
  const version = process.env.NEXT_PUBLIC_WHATSAPP_API_VERSION ?? "v25.0";
  const canConnect = Boolean(appId && configId);
  const message = params.updated === "connected" ? "WhatsApp connected." : params.error ? "WhatsApp connection failed." : null;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#000000]">WhatsApp</h1>
          <p className="mt-2 text-[#000000]">Connect the WhatsApp Business number for {tenant.name}.</p>
        </div>
        <Badge tone="cyan" className="gap-2"><ShieldCheck className="h-3.5 w-3.5" />settings:manage</Badge>
      </section>

      {message ? <div className="rounded-lg border border-[#7c3aed]/35 bg-[#f4ecff] px-4 py-3 text-sm text-black">{message}</div> : null}

      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#f4ecff] text-[#7c3aed] ring-1 ring-[#7c3aed]/40">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-black">Connection Status</h2>
              <p className="mt-1 text-sm text-[#000000]">{connection?.phone_number ?? "No WhatsApp number connected"}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-[#000000]">Status</dt><dd className="font-semibold text-black">{connection?.status ?? "Disconnected"}</dd></div>
                <div><dt className="text-[#000000]">Phone Number ID</dt><dd className="break-all text-black">{connection?.phone_number_id ?? "Not set"}</dd></div>
                <div><dt className="text-[#000000]">WABA ID</dt><dd className="break-all text-black">{connection?.waba_id ?? "Not set"}</dd></div>
              </dl>
            </div>
          </div>
          <form action={saveWhatsAppConnection} id="whatsapp-embedded-signup-form">
            <input type="hidden" name="code" id="wa-code" />
            <input type="hidden" name="phoneNumberId" id="wa-phone-number-id" />
            <input type="hidden" name="wabaId" id="wa-waba-id" />
            <input type="hidden" name="phoneNumber" id="wa-phone-number" />
            <button id="wa-connect-button" type="button" disabled={!canConnect} className="h-11 rounded-lg bg-[#7c3aed] px-5 text-sm font-semibold text-black transition hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60">
              Connect WhatsApp
            </button>
          </form>
        </div>
      </Card>

      <script
        dangerouslySetInnerHTML={{
          __html: `
window.fbAsyncInit=function(){FB.init({appId:${JSON.stringify(appId)},autoLogAppEvents:true,xfbml:true,version:${JSON.stringify(version)}})};
let waSignup={};
window.addEventListener("message",function(event){if(event.origin!=="https://www.facebook.com"&&event.origin!=="https://web.facebook.com")return;try{var data=JSON.parse(event.data);if(data.type==="WA_EMBEDDED_SIGNUP"&&data.event==="FINISH"){waSignup.phoneNumberId=data.data.phone_number_id;waSignup.wabaId=data.data.waba_id;waSignup.phoneNumber=data.data.phone_number||"";}}catch{}});
document.getElementById("wa-connect-button")?.addEventListener("click",function(){if(!window.FB)return;FB.login(function(response){if(!response.authResponse?.code||!waSignup.phoneNumberId||!waSignup.wabaId)return;document.getElementById("wa-code").value=response.authResponse.code;document.getElementById("wa-phone-number-id").value=waSignup.phoneNumberId;document.getElementById("wa-waba-id").value=waSignup.wabaId;document.getElementById("wa-phone-number").value=waSignup.phoneNumber||"";document.getElementById("whatsapp-embedded-signup-form").requestSubmit();},{config_id:${JSON.stringify(configId)},response_type:"code",override_default_response_type:true,extras:{sessionInfoVersion:2}});});
          `,
        }}
      />
      <script async defer crossOrigin="anonymous" src="https://connect.facebook.net/en_US/sdk.js" />
    </div>
  );
}
