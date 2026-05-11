/** File: Dashboard shell layout that wraps all dashboard pages with navbar and user controls. */
import { ReactNode } from "react";
import { UserButton } from '@clerk/nextjs';
import { NavBar } from "@/components/ui/NavBar";

/**
 * Composes the authenticated dashboard page structure.
 * @param children Child dashboard route content.
 * @returns Dashboard layout tree.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="relative">
        <NavBar />
        <div className="absolute right-4 top-1/2 z-50 -translate-y-1/2 md:right-8">
          <UserButton />
        </div>
      </div>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
