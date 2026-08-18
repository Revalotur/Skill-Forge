"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { CvAnalysis } from "@/lib/api";

export function CvAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [targetCareer, setTargetCareer] = useState("");
  const [result, setResult] = useState<CvAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const res = await fetch("/api/cv/latest", { cache: "no-store" });
        if (res.ok && !stale) {
          const data = await res.json();
          setResult(data);
        }
      } catch {
        // ignore: belum pernah analisis
      }
    })();
    return () => {
      stale = true;
    };
  }, []);

  async function analyze() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target_career", targetCareer.trim());
    try {
      const res = await fetch("/api/cv/analyze", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menganalisis CV.");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  const a = result?.analysis;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-2">
            <Input
              type="file"
              accept="application/pdf"
              ref={inputRef}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="cursor-pointer"
            />
            <Input
              value={targetCareer}
              onChange={(e) => setTargetCareer(e.target.value)}
              placeholder="Target karier (opsional, contoh: Frontend Developer)"
            />
          </div>
          <Button onClick={() => void analyze()} disabled={loading || !file}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Analisis CV
          </Button>
          <p className="text-xs text-muted-foreground">
            Upload CV PDF (maks 5MB). Skor ATS & skill gap dihitung otomatis.
          </p>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="flex items-center gap-3 p-5 text-sm text-destructive">
            <AlertTriangle className="size-5 shrink-0" /> {error}
          </CardContent>
        </Card>
      )}

      {a && (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center rounded-full border bg-muted">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{result?.filename ?? "CV"}</h2>
                  <p className="text-sm text-muted-foreground">
                    {a.word_count} kata • {a.quantified_mentions} angka pencapaian
                    {a.target_career ? ` • target: ${a.target_career}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 text-sm sm:items-end">
                <span className="font-semibold">Skor ATS</span>
                <span className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{a.ats_score}/100</span>
                  <Badge variant={a.source === "gemini" ? "default" : "secondary"}>
                    {a.source === "gemini" ? <Sparkles className="size-3" /> : null}
                    {a.source === "gemini" ? "AI" : "rule-based"}
                  </Badge>
                </span>
              </div>
            </CardContent>
            <CardContent className="flex flex-wrap gap-3 border-t px-6 py-3 text-sm">
              <span className="text-muted-foreground">Kontak: {a.contact_score}/10</span>
              <span className="text-muted-foreground">Struktur: {a.structure_score}/20</span>
              <span className="text-muted-foreground">Skill: {a.skills_score}/35</span>
              <span className="text-muted-foreground">Kuantifikasi: {a.quantified_score}/10</span>
              <span className="text-muted-foreground">Panjang: {a.length_score}/10</span>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Skill Terdeteksi</CardTitle>
                <CardDescription>Skill yang cocok dengan target karier.</CardDescription>
              </CardHeader>
              <CardContent>
                {a.detected_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {a.detected_skills.map((s) => (
                      <Badge key={s} variant="secondary">{s}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada skill yang cocok dengan target karier.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skill yang Kurang</CardTitle>
                <CardDescription>Skill yang wajib ditambahkan di CV.</CardDescription>
              </CardHeader>
              <CardContent>
                {a.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {a.missing_skills.map((s) => (
                      <Badge key={s} variant="destructive">{s}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Semua skill target sudah ada. 🎯</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Saran Perbaikan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {a.suggestions.length > 0 ? (
                  a.suggestions.map((s, i) => (
                    <li key={i} className="rounded-lg border p-3 text-sm">{s}</li>
                  ))
                ) : (
                  <li className="rounded-lg border p-3 text-sm text-muted-foreground">
                    CV sudah cukup baik. 🎉
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}