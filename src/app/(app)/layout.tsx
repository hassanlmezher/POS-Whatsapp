import type React from "react";
import { AppShell } from "@/components/app/app-shell";

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
