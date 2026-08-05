import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const features = [
  {
    emoji: "🗺️",
    title: "Roadmap Personal",
    desc: "AI menyusun urutan belajar sesuai karier, skill, dan waktumu.",
  },
  {
    emoji: "✅",
    title: "Progress Tracker",
    desc: "Checklist materi, progress bar, dan persentase penyelesaian.",
  },
  {
    emoji: "🎯",
    title: "Daily Mission",
    desc: "Tugas harian agar kamu tetap konsisten belajar.",
  },
  {
    emoji: "🤖",
    title: "AI Mentor",
    desc: "Tanya apa saja dengan konteks roadmapmu.",
  },
  {
    emoji: "📊",
    title: "Career Gap",
    desc: "Tahu skill yang masih kurang untuk target kariermu.",
  },
  {
    emoji: "🚀",
    title: "Job Readiness",
    desc: "Skor kesiapanmu untuk melamar kerja.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span aria-hidden="true">🏗️</span> SkillForge
        </span>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Daftar</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted px-4 py-1.5 text-sm text-muted-foreground">
          🎓 AI Learning Roadmap Platform
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Dari bingung, jadi{" "}
          <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            siap kerja
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          SkillForge membantumu menyusun roadmap belajar yang dipersonalisasi,
          memantau progres, dan mengevaluasi kesiapanmu memasuki dunia kerja.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/register">Mulai Gratis</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Lihat Demo</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title} className={cn("transition hover:-translate-y-0.5")}>
              <CardContent className="flex flex-col gap-3 p-6">
                <span className="text-3xl" aria-hidden="true">
                  {f.emoji}
                </span>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
