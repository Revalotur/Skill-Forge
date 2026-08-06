"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, CheckCircle2, Flame, ListChecks } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Analytics } from "@/lib/api";

export function AnalyticsView() {
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil statistik.");
      }
      setData(await res.json());
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
  }, [fetchData]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-muted/30" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <div>
            <p className="font-medium">Terjadi kesalahan</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
          >
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.total_tasks === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <BarChart3 className="size-10 text-primary" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Belum ada data statistik</h2>
            <p className="text-sm text-muted-foreground">
              Statistik akan tampil setelah kamu menyusun roadmap dan mulai
              menyelesaikan materi.
            </p>
          </div>
          <Button size="lg" onClick={() => router.push("/roadmap")}>
            Buat Roadmap
          </Button>
        </CardContent>
      </Card>
    );
  }

  const weekData = data.weekly_distribution.map((w) => ({
    week: w.label,
    Selesai: w.completed,
    Total: w.total,
  }));

  const dayData = data.last_7_days.map((d) => ({
    day: d.label,
    Selesai: d.completed,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Total Progres</span>
              <span className="text-2xl font-bold">{data.progress_percent}%</span>
            </div>
            <BarChart3 className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Streak Saat Ini</span>
              <span className="text-2xl font-bold">{data.current_streak} hari</span>
            </div>
            <Flame className="size-8 text-orange-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Task Selesai</span>
              <span className="text-2xl font-bold">
                {data.completed_tasks}
                <span className="text-base text-muted-foreground">/{data.total_tasks}</span>
              </span>
            </div>
            <CheckCircle2 className="size-8 text-green-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Misi Selesai</span>
              <span className="text-2xl font-bold">{data.missions_completed}</span>
            </div>
            <ListChecks className="size-8 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas 7 Hari Terakhir</CardTitle>
            <CardDescription>Task yang selesai per hari.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Selesai" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribusi per Minggu</CardTitle>
            <CardDescription>Selesai vs total task per minggu.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Selesai" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Total" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.recent_activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terakhir</CardTitle>
            <CardDescription>Materi yang baru saja kamu selesaikan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {data.recent_activity.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-lg border p-3 text-sm"
                >
                  <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Minggu {a.week}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
