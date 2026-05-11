"use client";

/** File: UI/application module for the dashboard project. */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ExternalLink, Menu } from "lucide-react";

const navItems = [
  { name: "Overview", href: "/dashboard" },
  { name: "Users", href: "/dashboard/users" },
  { name: "Logs", href: "/dashboard/logs" },
];

const appName = process.env.NEXT_PUBLIC_APP_NAME || "App";
const apiDocsUrl = process.env.NEXT_PUBLIC_API_DOCS_URL || "#";

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { getToken } = useAuth();

  const handleApiDocsClick = async () => {
    try {
      const token = await getToken();
      window.open(`${apiDocsUrl}?token=${token}`, "_blank", "noopener,noreferrer");
    } catch {
      window.open(apiDocsUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center px-4 md:px-8">
        <div className="mr-8 hidden md:flex">
          <Link href="/dashboard" className="flex items-center space-x-2 mr-6 text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span className="font-bold sm:inline-block">{appName}</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  pathname === item.href ? "text-foreground font-semibold" : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
            <button
              onClick={handleApiDocsClick}
              className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>API Docs</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </nav>
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 md:hidden"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0 sm:max-w-xs">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="px-2 my-4">
              <Link href="/dashboard" className="flex items-center space-x-2 text-primary" onClick={() => setOpen(false)}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
                </svg>
                <span className="font-bold">{appName}</span>
              </Link>
            </div>
            <div className="flex flex-col space-y-4 px-2 mt-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "text-lg text-muted-foreground transition-colors hover:text-foreground",
                    pathname === item.href && "text-foreground font-semibold"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <button
                onClick={async () => {
                  await handleApiDocsClick();
                  setOpen(false);
                }}
                className="flex items-center gap-1 text-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>API Docs</span>
                <ExternalLink className="h-4 w-4" />
              </button>
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Mobile title */}
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
             <span className="font-bold md:hidden text-primary">{appName}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
