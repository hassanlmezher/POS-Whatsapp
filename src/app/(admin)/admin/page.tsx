import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Activity, Building2, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin | InChouf POS",
  description: "Platform administration for InChouf POS.",
};

const overview: Array<{ label: string; value: string; icon: LucideIcon }> = [
  { label: "Tenants", value: "0", icon: Building2 },
  { label: "Users", value: "0", icon: Users },
  { label: "System Health", value: "Ready", icon: Activity },
];

export default function AdminPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6 sm:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black leading-tight text-[#f8fbff]">Platform Overview</h1>
          <p className="mt-1 text-sm text-[#8fa3ad]">Super admin controls for the InChouf POS platform.</p>
        </div>
        <Badge tone="cyan" className="gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Super Admin
        </Badge>
      </section>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {overview.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg border border-[#1d3038] bg-[#0b1114] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#6f858f]">{label}</span>
                <Icon className="h-5 w-5 text-[#22ddeb]" />
              </div>
              <div className="mt-5 text-2xl font-black text-[#f8fbff]">{value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
