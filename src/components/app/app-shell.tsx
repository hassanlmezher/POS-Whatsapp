import type React from "react";
import { Header } from "@/components/app/header";
import { MobileNav, Sidebar } from "@/components/app/sidebar";

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950">
      <Sidebar />
      <div className="min-h-screen lg:pl-[270px]">
        <Header title={title} />
        <main className="pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
