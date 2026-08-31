import { Building2, CalendarDays, IdCard, Mail, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { updateAccountProfile, updateCompanyProfile } from "@/app/(app)/settings/actions";
import { getTenantContext } from "@/lib/tenant-context";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PasswordForm } from "@/components/settings/password-form";

export const dynamic = "force-dynamic";

type SettingsPageProps = {
  searchParams: Promise<{ updated?: string; error?: string }>;
};

const companyEditRoles = new Set(["owner", "admin", "manager"]);

const errorMessages: Record<string, string> = {
  "invalid-profile": "Check your profile name.",
  "invalid-avatar": "Upload a JPG, PNG, WebP, or GIF avatar under 5 MB.",
  "avatar-upload-failed": "Profile picture could not be uploaded.",
  "profile-update-failed": "Profile could not be updated.",
  "invalid-company": "Check company name, currency, tax rate, and timezone.",
  "company-permission-denied": "Your role cannot edit company profile settings.",
  "company-update-failed": "Company profile could not be updated.",
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString("en-US", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatRole(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [{ membership, tenant, user }, params] = await Promise.all([getTenantContext(), searchParams]);
  const canEditCompany = companyEditRoles.has(membership.role);
  const successMessage =
    params.updated === "profile"
      ? "Profile updated."
      : params.updated === "company"
        ? "Company profile updated."
        : null;
  const errorMessage = params.error ? errorMessages[params.error] ?? "Settings could not be updated." : null;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div>
        <h1 className="text-2xl font-black text-[#f8fbff]">Settings</h1>
        <p className="mt-2 text-[#8fa3ad]">Account, business profile, and security.</p>
      </div>

      {successMessage ? (
        <div className="rounded-lg border border-[#22ddeb]/35 bg-[#082529] px-4 py-3 text-sm text-white">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-lg border border-[#8d2638] bg-[#351018] px-4 py-3 text-sm text-[#ff9aac]">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-5">
              <Avatar name={membership.name} src={membership.avatarUrl} className="h-20 w-20 shadow-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-semibold text-white">{membership.name}</h2>
                  <Badge tone="cyan">{formatRole(membership.role)}</Badge>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-[#8fa3ad] md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#22ddeb]" />
                    <span className="truncate">{user.email ?? "No email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[#22ddeb]" />
                    <span>Account created {formatDate(user.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IdCard className="h-4 w-4 text-[#22ddeb]" />
                    <span>Member since {formatDate(membership.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#22ddeb]" />
                    <span>Last sign-in {formatDateTime(user.last_sign_in_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            <form action={updateAccountProfile} encType="multipart/form-data" className="mt-6 grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold text-white">
                Display Name
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={membership.name}
                  className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
                />
              </label>
              <label className="block text-sm font-semibold text-white">
                Profile Picture
                <input
                  name="avatarFile"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mt-2 block h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 py-3 text-sm text-[#8fa3ad] outline-none file:mr-4 file:rounded-md file:border-0 file:bg-[#082529] file:px-3 file:py-1 file:text-sm file:font-bold file:text-[#22ddeb] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15"
                />
              </label>
              <div className="flex justify-end md:col-span-2">
                <button
                  type="submit"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(34,221,235,0.2)] transition hover:bg-[#2ff4ff]"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </Card>

          <Card className="p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Company Profile</h2>
                <p className="text-sm text-[#8fa3ad]">Business profile for this employee account.</p>
              </div>
            </div>

            <form action={updateCompanyProfile} className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-semibold text-white">
                Business Name
                <input
                  name="name"
                  required
                  minLength={2}
                  defaultValue={tenant.name}
                  disabled={!canEditCompany}
                  className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15 disabled:opacity-65"
                />
              </label>
              <label className="block text-sm font-semibold text-white">
                Currency
                <input
                  name="currency"
                  required
                  maxLength={3}
                  defaultValue={tenant.currency}
                  disabled={!canEditCompany}
                  className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 uppercase text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15 disabled:opacity-65"
                />
              </label>
              <label className="block text-sm font-semibold text-white">
                Tax Rate %
                <input
                  name="taxRatePercent"
                  min="0"
                  max="100"
                  step="0.01"
                  type="number"
                  defaultValue={tenant.taxRate * 100}
                  disabled={!canEditCompany}
                  className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15 disabled:opacity-65"
                />
              </label>
              <label className="block text-sm font-semibold text-white">
                Timezone
                <input
                  name="timezone"
                  defaultValue={tenant.timezone ?? "UTC"}
                  disabled={!canEditCompany}
                  className="mt-2 h-12 w-full rounded-lg border border-[#1d3038] bg-[#0b1114] px-4 text-white outline-none placeholder:text-[#6f858f] focus:border-[#22ddeb] focus:ring-4 focus:ring-[#22ddeb]/15 disabled:opacity-65"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
                <div className="text-sm text-[#8fa3ad]">
                  Business created {formatDate(tenant.createdAt)}. Slug:{" "}
                  <span className="font-semibold text-white">{tenant.slug}</span>
                </div>
                {canEditCompany ? (
                  <button
                    type="submit"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-[#22ddeb] px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(34,221,235,0.2)] transition hover:bg-[#2ff4ff]"
                  >
                    Save Company
                  </button>
                ) : (
                  <Badge tone="slate">View only</Badge>
                )}
              </div>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                <UserRound className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">Business Access</h2>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="font-black uppercase tracking-[0.14em] text-[#6f858f]">Business</dt>
                <dd className="mt-1 text-white">{tenant.name}</dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-[0.14em] text-[#6f858f]">Role</dt>
                <dd className="mt-1 text-white">{formatRole(membership.role)}</dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-[0.14em] text-[#6f858f]">Membership ID</dt>
                <dd className="mt-1 break-all text-[#8fa3ad]">{membership.id}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#082529] text-[#22ddeb] ring-1 ring-[#22ddeb]/40">
                <Smartphone className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-white">WhatsApp</h2>
            </div>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="font-black uppercase tracking-[0.14em] text-[#6f858f]">Phone Number</dt>
                <dd className="mt-1 text-white">{tenant.whatsappPhoneNumber ?? "Not connected"}</dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-[0.14em] text-[#6f858f]">Phone Number ID</dt>
                <dd className="mt-1 break-all text-[#8fa3ad]">{tenant.whatsappPhoneNumberId ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="font-black uppercase tracking-[0.14em] text-[#6f858f]">Business Account ID</dt>
                <dd className="mt-1 break-all text-[#8fa3ad]">{tenant.whatsappBusinessAccountId ?? "Not set"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <PasswordForm />
          </Card>
        </div>
      </section>
    </div>
  );
}
