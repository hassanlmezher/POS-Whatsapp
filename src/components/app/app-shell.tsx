import { Suspense, type ReactNode } from "react";
import { Header } from "@/components/app/header";
import { NavigationProgress } from "@/components/app/navigation-progress";
import { MobileNav, Sidebar } from "@/components/app/sidebar";

export function AppShell({
  children,
  title,
  userAvatarUrl,
  userName,
}: {
  children: ReactNode;
  title?: string;
  userAvatarUrl?: string | null;
  userName: string;
}) {
  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000000]">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar />
      <div className="min-h-screen lg:pl-[300px]">
        <Header title={title} userAvatarUrl={userAvatarUrl} userName={userName} />
        <main className="pb-20 lg:pb-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
