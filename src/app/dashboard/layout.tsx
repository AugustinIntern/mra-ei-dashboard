import { ReactNode } from "react";
import { NavBar } from "@/components/ui/NavBar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
