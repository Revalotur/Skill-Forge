"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, Flame, Loader2, PartyPopper } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyMission, Streak } from "@/lib/api";

export function MissionCard() {
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [missionRes, streakRes] = await Promise.all([
        fetch("/api/mission/today", { cache: "no-store" }),
        fetch("/api/mission/streak", { cache: "no-store" }),
      ]);

      if (missionRes.ok) {
        setMission(await missionRes.json());
        setError(null);
      } else if (missionRes.status === 404) {
        setMission(null);
        setError(null);
      } else {
        const body = await missionRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil misi.");
      }

      if (streakRes.ok) {
        setStreak(await streakRes.json());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchData();
    })();
    window.addEventListener("mission-updated", fetchData);
    return () => window.removeEventListener("mission-updated", fetchData);
  }, [fetchData]);

  async function onComplete() {
    if (!mission || mission.is_completed) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/mission/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyelesaikan misi.");
      }
      const updated = await res.json();
      setMission(updated);
      toast.success("Misi selesai! 🔥 Streak bertambah.");
      window.dispatchEvent(new Event("mission-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-xl border bg-muted/30" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            Misi Hari Ini
          </CardTitle>
          <CardDescription>
            {streak
              ? `Streak ${streak.current_streak} hari • total ${streak.missions_completed} misi selesai`
              : "Tugas belajar harianmu"}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && !mission && (
          <p className="text-sm text-muted-foreground">{error}</p>
        )}
        {!mission && !error && (
          <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <PartyPopper className="size-5 text-primary" />
            Semua materi sudah selesai. Tidak ada misi untuk hari ini. 🎉
          </div>
        )}
        {mission && (
          <div className="flex flex-col gap-3">
            {!mission.is_completed && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertCircle className="size-4" />
                Belum dikerjakan — selesaikan hari ini untuk menjaga streak-mu.
              </div>
            )}
            <div className="flex items-center gap-3">
            {mission.is_completed ? (
              <CheckCircle2 className="size-6 shrink-0 text-green-500" />
            ) : (
              <Circle className="size-6 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 flex-1">
              <p
                className={
                  mission.is_completed
                    ? "text-sm font-medium text-muted-foreground line-through"
                    : "text-sm font-medium"
                }
              >
                {mission.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {mission.is_completed
                  ? "Selesai! Lanjutkan materi berikutnya. 🔥"
                  : "Selesaikan misi ini untuk menjaga streak-mu."}
              </p>
            </div>
            {!mission.is_completed && (
              <Button size="sm" onClick={onComplete} disabled={updating}>
                {updating ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Selesai"
                )}
              </Button>
            )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
