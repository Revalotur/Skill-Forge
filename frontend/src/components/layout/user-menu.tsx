"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";

export function UserMenu({
  email,
}: {
  email: string | null;
}) {
  const router = useRouter();

  async function onSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {email ?? "Pengguna"}
      </span>
      <Button variant="ghost" size="icon" onClick={onSignOut} aria-label="Keluar">
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
