"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Loader2,
  Search,
  Star,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { GithubAnalysis } from "@/lib/api";

export function GithubAnalyzer() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<GithubAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    void (async () => {
      try {
        const res = await fetch("/api/github/latest", { cache: "no-store" });
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
    const value = username.trim();
    if (!value || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/github/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menganalisis GitHub.");
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
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username GitHub (contoh: revalotur)"
              className="pl-9"
              onKeyDown={(e) => {
                if (e.key === "Enter") void analyze();
              }}
            />
          </div>
          <Button onClick={() => void analyze()} disabled={loading || !username.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <GitBranch className="size-4" />}
            Analisis
          </Button>
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.profile.avatar_url || "/vercel.svg"}
                  alt={a.username}
                  className="size-16 rounded-full border"
                />
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold">{a.profile.name || a.username}</h2>
                  <p className="text-sm text-muted-foreground">@{a.username}</p>
                  {a.profile.bio && (
                    <p className="max-w-md text-sm text-muted-foreground">{a.profile.bio}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-start gap-1 text-sm sm:items-end">
                <span className="font-semibold">Skor GitHub</span>
                <span className="text-3xl font-bold">{a.score}/100</span>
              </div>
            </CardContent>
            <CardContent className="flex flex-wrap gap-3 border-t px-6 py-3 text-sm">
              <span className="text-muted-foreground">Followers: {a.profile.followers}</span>
              <span className="text-muted-foreground">Repos: {a.profile.public_repos}</span>
              <span className="text-muted-foreground">Following: {a.profile.following}</span>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tech Stack</CardTitle>
                <CardDescription>Bahasa dominan di repo kamu.</CardDescription>
              </CardHeader>
              <CardContent>
                {a.tech_stack.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {a.tech_stack.map((t) => (
                      <Badge key={t} variant="secondary">{t}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada bahasa terdeteksi.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Best Practices</CardTitle>
                <CardDescription>Cek kualitas repo kamu.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <span className="flex items-center gap-2">
                  {a.best_practices.readme_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  README ({a.best_practices.readme_count} repo)
                </span>
                <span className="flex items-center gap-2">
                  {a.best_practices.license_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  LICENSE ({a.best_practices.license_count} repo)
                </span>
                <span className="flex items-center gap-2">
                  {a.best_practices.ci_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  CI/CD ({a.best_practices.ci_count} repo)
                </span>
                <span className="flex items-center gap-2">
                  {a.best_practices.test_count > 0 ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : (
                    <XCircle className="size-4 text-muted-foreground" />
                  )}
                  Tests ({a.best_practices.test_count} repo)
                </span>
              </CardContent>
            </Card>
          </div>

          {a.repos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Repo Teratas</CardTitle>
                <CardDescription>Top {a.repos.length} repo berdasarkan stars.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-2">
                  {a.repos.map((r) => (
                    <li key={r.name} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                      <Star className="size-4 shrink-0 text-amber-500" />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.name}</span>
                      {r.language && <Badge variant="secondary">{r.language}</Badge>}
                      <span className="shrink-0 text-muted-foreground">{r.stars} ⭐</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Rekomendasi</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {a.recommendations.map((r, i) => (
                  <li key={i} className="rounded-lg border p-3 text-sm">{r}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
