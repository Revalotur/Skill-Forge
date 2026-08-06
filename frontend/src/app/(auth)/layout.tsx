import Link from "next/link";

import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute -bottom-32 left-0 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-600/15" />
      </div>
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>
      <Link
        href="/"
        className="absolute top-5 left-5 text-sm font-bold text-foreground"
      >
        <span className="mr-1" aria-hidden="true">
          🏗️
        </span>
        SkillForge
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
