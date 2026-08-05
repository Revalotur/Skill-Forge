"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export type AssessmentData = {
  targetCareer: string;
  currentSkills: string;
  learningHours: string;
  deadline: string;
  experience: string;
};

const STEPS = ["Karier", "Skill", "Waktu", "Deadline", "Pengalaman"];

const CAREER_OPTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Developer",
  "Data Analyst",
  "Data Scientist",
  "UI/UX Designer",
  "Mobile Developer",
  "DevOps Engineer",
];

const HOUR_OPTIONS = ["1–2 jam", "3–4 jam", "5–6 jam", "7+ jam"];

export function AssessmentForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AssessmentData>({
    targetCareer: "",
    currentSkills: "",
    learningHours: "",
    deadline: "",
    experience: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof AssessmentData>(
    key: K,
    value: AssessmentData[K]
  ) {
    setData((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function validateStep(): string | null {
    switch (step) {
      case 0:
        return data.targetCareer ? null : "Pilih target karier.";
      case 1:
        return data.currentSkills.trim().length >= 2
          ? null
          : "Tuliskan skill yang kamu miliki (min. 2 karakter).";
      case 2:
        return data.learningHours ? null : "Pilih jam belajar per hari.";
      default:
        return null;
    }
  }

  function next() {
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyimpan assessment.");
      }
      router.push("/roadmap");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6">
        {/* Step indicator */}
        <ol className="flex items-center gap-1.5 text-xs">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className="flex flex-1 flex-col items-center gap-1.5"
            >
              <span
                className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold ${
                  i <= step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <span
                className={
                  i <= step ? "text-foreground" : "text-muted-foreground"
                }
              >
                {label}
              </span>
            </li>
          ))}
        </ol>

        <form onSubmit={submit} className="flex flex-col gap-5">
          {step === 0 && (
            <div className="flex flex-col gap-2">
              <Label>Target Karier</Label>
              <div className="grid grid-cols-2 gap-2">
                {CAREER_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => update("targetCareer", opt)}
                    className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      data.targetCareer === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentSkills">
                Skill yang sudah kamu miliki
              </Label>
              <Input
                id="currentSkills"
                value={data.currentSkills}
                onChange={(e) => update("currentSkills", e.target.value)}
                placeholder="contoh: HTML, CSS, dasar JavaScript"
              />
              <p className="text-xs text-muted-foreground">
                Pisahkan dengan koma. Kosongkan jika belum punya pengalaman.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-2">
              <Label>Jam belajar per hari</Label>
              <div className="grid grid-cols-2 gap-2">
                {HOUR_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => update("learningHours", opt)}
                    className={`rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                      data.learningHours === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="deadline">
                Deadline (opsional)
              </Label>
              <Input
                id="deadline"
                type="date"
                value={data.deadline}
                onChange={(e) => update("deadline", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Contoh: ingin siap melamar dalam 3 bulan.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="experience">Pengalaman sebelumnya</Label>
              <textarea
                id="experience"
                value={data.experience}
                onChange={(e) => update("experience", e.target.value)}
                rows={5}
                placeholder="Ceritakan pengalaman belajarmu sejauh ini (opsional)"
                className="border-input bg-background placeholder:text-muted-foreground flex w-full rounded-md border px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={back}
              disabled={step === 0}
            >
              <ArrowLeft /> Kembali
            </Button>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Lanjut <ArrowRight />
              </Button>
            ) : (
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin" />}
                Selesai
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
