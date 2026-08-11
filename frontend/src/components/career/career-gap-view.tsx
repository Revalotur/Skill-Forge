"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { CareerGap } from "@/lib/api";

export function CareerGapView() {
  const router = useRouter();
  const [data, setData] = useState<CareerGap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/career-gap", { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil analisis karier.");
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
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
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

  if (!data || !data.target_career || data.target_career === "Belum ditentukan") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
          <Target className="size-10 text-primary" />
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Belum ada data karier</h2>
            <p className="text-sm text-muted-foreground">
              Lengkapi assessment dulu agar AI bisa menganalisis skill gap
              dan kesiapan kariermu.
            </p>
          </div>
          <Button size="lg" onClick={() => router.push("/assessment")}>
            Isi Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Job Readiness Score <Sparkles className="size-4 text-primary" />
          </CardTitle>
          <CardDescription>
            Skor kesiapan melamar kerja untuk target {data.target_career}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Kesiapan kerja</span>
            <span className="text-2xl font-bold">{data.readiness_score}/100</span>
          </div>
          <Progress value={data.readiness_score} />
          <p className="text-sm text-muted-foreground">
            Progres roadmap: {data.roadmap_progress}% • Skill terpenuhi:{" "}
            {data.current_skills.length}/{data.required_skills.length}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Skill yang Kamu Punya</CardTitle>
            <CardDescription>Sudah dikuasai dari assessment & task selesai.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.current_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.current_skills.map((s) => (
                  <Badge key={s} variant="default" className="gap-1">
                    <CheckCircle2 className="size-3" /> {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada skill terdeteksi.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill yang Masih Kurang</CardTitle>
            <CardDescription>Fokus belajari ini agar siap melamar.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.missing_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {data.missing_skills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1 text-muted-foreground">
                    <XCircle className="size-3" /> {s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-600">
                Semua skill terpenuhi. Siap melamar! 🎯
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rekomendasi</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {data.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
