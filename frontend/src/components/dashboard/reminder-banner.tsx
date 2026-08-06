"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DailyMission } from "@/lib/api";

export function ReminderBanner() {
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/mission/today", { cache: "no-store" });
      if (res.status === 404) {
        setMission(null);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil misi.");
      }
      const data = (await res.json()) as DailyMission;
      setMission(data);
    } catch {
      setMission(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refetch();
    })();
    window.addEventListener("mission-updated", refetch);
    return () => window.removeEventListener("mission-updated", refetch);
  }, [refetch]);

  if (loading || !mission || mission.is_completed) return null;

  const missionId = mission.id;

  async function onComplete() {
    setUpdating(true);
    try {
      const res = await fetch(`/api/mission/${missionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyelesaikan misi.");
      }
      setMission(null);
      toast.success("Misi selesai! 🔥 Streak bertambah.");
      window.dispatchEvent(new Event("mission-updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
          <BellRing className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Misi hari ini belum dikerjakan</p>
          <p className="text-sm text-muted-foreground">
            Selesaikan {mission.title} untuk menjaga streak-mu.
          </p>
        </div>
      </div>
      <Button size="sm" onClick={onComplete} disabled={updating}>
        {updating ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="size-4" />}
        Selesaikan
      </Button>
    </div>
  );
}
