import Link from "next/link";
import {
  Map,
  CheckSquare,
  Target,
  Bot,
  TrendingUp,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const features = [
  {
    icon: Map,
    title: "Roadmap Personal",
    desc: "AI menyusun urutan belajar sesuai karier, skill, dan waktumu.",
  },
  {
    icon: CheckSquare,
    title: "Progress Tracker",
    desc: "Checklist materi, progress bar, dan persentase penyelesaian.",
  },
  {
    icon: Target,
    title: "Daily Mission",
    desc: "Tugas harian agar kamu tetap konsisten belajar.",
  },
  {
    icon: Bot,
    title: "AI Mentor",
    desc: "Tanya apa saja dengan konteks roadmapmu.",
  },
  {
    icon: TrendingUp,
    title: "Career Gap",
    desc: "Tahu skill yang masih kurang untuk target kariermu.",
  },
  {
    icon: Rocket,
    title: "Job Readiness",
    desc: "Skor kesiapanmu untuk melamar kerja.",
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-violet-400/30 blur-3xl dark:bg-violet-600/20" />
        <div className="absolute top-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-600/15" />
        <div className="absolute top-80 -right-40 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-600/15" />
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-bold">
          <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm text-white">
            🏗️
          </span>
          SkillForge
        </span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Daftar</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 pt-24 pb-16 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-sm text-muted-foreground shadow-sm backdrop-blur">
          <span aria-hidden="true">🎓</span> AI Learning Roadmap Platform
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Dari bingung, jadi{" "}
          <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 bg-clip-text text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-violet-400">
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
            <Card
              key={f.title}
              className="group transition duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10"
            >
              <CardContent className="flex flex-col gap-3 p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15 text-violet-600 transition group-hover:from-violet-500 group-hover:to-fuchsia-500 group-hover:text-white dark:text-violet-300">
                  <f.icon className="size-5" />
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
