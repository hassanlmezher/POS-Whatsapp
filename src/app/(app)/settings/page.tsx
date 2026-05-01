import { Building2, CreditCard, KeyRound, Percent, Smartphone, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

const sections = [
  { title: "Company Profile", icon: Building2, text: "Legal name, brand identity, currency, and receipt details." },
  { title: "Employee Management", icon: Users, text: "Invite users and assign owner, admin, manager, cashier, or support roles." },
  { title: "WhatsApp Integration", icon: Smartphone, text: "Business Account ID, phone number ID, webhook verification, and token status." },
  { title: "Tax Settings", icon: Percent, text: "Default rates by branch and inclusive or exclusive tax behavior." },
  { title: "Payment Methods", icon: CreditCard, text: "Cash drawers, card terminals, payment providers, and reconciliation rules." },
  { title: "API & Security", icon: KeyRound, text: "Rotate integration secrets and review webhook delivery logs." },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-5 lg:p-8">
      <div><h1 className="text-2xl font-black text-[#080c1a]">Settings</h1><p className="mt-2 text-[#536884]">Configure company, terminals, integrations, and operations.</p></div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef2f7] text-[#0b4edb] ring-1 ring-[#d9deea]"><Icon className="h-5 w-5" /></div>
              <h2 className="mt-5 text-lg font-semibold text-[#080c1a]">{section.title}</h2>
              <p className="mt-3 leading-7 text-[#536884]">{section.text}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
