"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BarChart3, Flame, Target, TrendingUp } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { MissionCard } from "@/components/dashboard/mission-card";
import type { Roadmap, RoadmapSummary, Streak } from "@/lib/api";

export function DashboardView({ email }: { email: string | null }) {
  const router = useRouter();
  const [summary, setSummary] = useState<RoadmapSummary | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noData, setNoData] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const summaryRes = await fetch("/api/roadmap/summary", { cache: "no-store" });
      if (summaryRes.status === 404) {
        setNoData(true);
        setSummary(null);
        setRoadmap(null);
        return;
      }
      if (!summaryRes.ok) {
        const body = await summaryRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil ringkasan.");
      }
      setSummary(await summaryRes.json());
      setNoData(false);

      const roadmapRes = await fetch("/api/roadmap/latest", { cache: "no-store" });
      if (roadmapRes.ok) {
        setRoadmap(await roadmapRes.json());
      }

      const streakRes = await fetch("/api/mission/streak", { cache: "no-store" });
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

  if (error && !summary) {
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

  if (noData || !summary) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold">Halo, selamat datang! 👋</h1>
          <p className="text-muted-foreground">
            {email ?? "Pengguna"} — Belum ada roadmap. Mulai dengan assessment untuk
            membuat roadmap AI-mu.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Target className="size-10 text-primary" />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Mulai perjalananmu</h2>
              <p className="text-sm text-muted-foreground">
                Isi assessment singkat, AI akan menyusun roadmap yang sesuai.
              </p>
            </div>
            <Button size="lg" onClick={() => router.push("/assessment")}>
              Isi Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const weeks =
    roadmap?.tasks
      ? Array.from(new Set(roadmap.tasks.map((t) => t.week).sort((a, b) => a - b)))
      : [];
  const chartData = weeks.map((week) => {
    const tasks = roadmap!.tasks.filter((t) => t.week === week);
    const done = tasks.filter((t) => t.is_completed).length;
    return { week: `W${week}`, Selesai: done, Total: tasks.length };
  });

  const streakDays = streak?.current_streak ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard 📊</h1>
        <p className="text-muted-foreground">
          {email ?? "Pengguna"} — Ringkasan progres belajarmu.
        </p>
      </div>

      <MissionCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Total Progres</span>
              <span className="text-2xl font-bold">{summary.progress_percent}%</span>
            </div>
            <BarChart3 className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Target Karier</span>
              <span className="text-lg font-bold leading-tight">
                {summary.target_career}
              </span>
            </div>
            <Target className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Task Selesai</span>
              <span className="text-2xl font-bold">
                {summary.completed_tasks}
                <span className="text-base text-muted-foreground">
                  /{summary.total_tasks}
                </span>
              </span>
            </div>
            <TrendingUp className="size-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">Streak</span>
              <span className="text-2xl font-bold">{streakDays} hari</span>
            </div>
            <Flame className="size-8 text-primary" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progres keseluruhan</span>
            <span>{summary.progress_percent}%</span>
          </div>
          <Progress value={summary.progress_percent} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Progres per Minggu</CardTitle>
          <CardDescription>
            Jumlah task selesai vs total per minggu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="Selesai" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Total" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada data mingguan.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
