import type React from "react";
import { Header } from "@/components/app/header";
import { MobileNav, Sidebar } from "@/components/app/sidebar";

export function AppShell({
  children,
  title,
  userAvatarUrl,
  userName,
}: {
  children: React.ReactNode;
  title?: string;
  userAvatarUrl?: string | null;
  userName: string;
}) {
  return (
    <div className="min-h-screen bg-[#030607] text-[#f8fbff]">
      <Sidebar />
      <div className="min-h-screen lg:pl-[300px]">
        <Header title={title} userAvatarUrl={userAvatarUrl} userName={userName} />
        <main className="pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
