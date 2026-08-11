"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  ClipboardList,
  MessageSquare,
  BarChart3,
  Target,
  GitBranch,
  User,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/assessment", label: "Assessment", icon: ClipboardList },
  { href: "/mentor", label: "AI Mentor", icon: MessageSquare },
  { href: "/analytics", label: "Statistik", icon: BarChart3 },
  { href: "/career", label: "Career Gap", icon: Target },
  { href: "/github", label: "GitHub Analyzer", icon: GitBranch },
  { href: "/profile", label: "Profil", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true">🏗️</span> SkillForge
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
