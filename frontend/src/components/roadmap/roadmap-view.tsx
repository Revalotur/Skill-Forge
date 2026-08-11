"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Roadmap, RoadmapTask } from "@/lib/api";

export function RoadmapView() {
  const router = useRouter();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [addingWeek, setAddingWeek] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await fetch("/api/roadmap/latest", { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        setRoadmap(null);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal mengambil roadmap.");
      }
      setRoadmap(await res.json());
      setNotFound(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchRoadmap();
    })();
  }, [fetchRoadmap]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal generate roadmap.");
      }
      setRoadmap(await res.json());
      setNotFound(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: instructions || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal regenerate roadmap.");
      }
      setRoadmap(await res.json());
      setShowRegenerate(false);
      setInstructions("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setGenerating(false);
    }
  }

  async function toggleTask(task: RoadmapTask) {
    setUpdatingId(task.id);
    setError(null);
    try {
      const res = await fetch(`/api/roadmap/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_completed: !task.is_completed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal update task.");
      }
      const updated = (await res.json()) as RoadmapTask;
      setRoadmap((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)),
            }
          : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdatingId(null);
    }
  }

  function startEdit(task: RoadmapTask) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description);
  }

  async function saveEdit(task: RoadmapTask) {
    setUpdatingId(task.id);
    setError(null);
    try {
      const res = await fetch(`/api/roadmap/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, description: editDesc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menyimpan task.");
      }
      const updated = (await res.json()) as RoadmapTask;
      setRoadmap((prev) =>
        prev
          ? {
              ...prev,
              tasks: prev.tasks.map((t) => (t.id === updated.id ? updated : t)),
            }
          : prev
      );
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleAddTask(week: number) {
    if (!roadmap || !newTaskTitle.trim()) return;
    setUpdatingId("new");
    setError(null);
    try {
      const res = await fetch("/api/roadmap/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmap_id: roadmap.id,
          week,
          title: newTaskTitle,
          description: newTaskDesc,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menambah task.");
      }
      const created = (await res.json()) as RoadmapTask;
      setRoadmap((prev) =>
        prev
          ? { ...prev, tasks: [...prev.tasks, created].sort((a, b) => a.week - b.week) }
          : prev
      );
      setAddingWeek(null);
      setNewTaskTitle("");
      setNewTaskDesc("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteTask(task: RoadmapTask) {
    if (!window.confirm("Hapus task ini?")) return;
    setUpdatingId(task.id);
    setError(null);
    try {
      const res = await fetch(`/api/roadmap/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menghapus task.");
      }
      setRoadmap((prev) =>
        prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== task.id) } : prev
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border bg-muted/30"
          />
        ))}
      </div>
    );
  }

  if (error && !roadmap) {
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
              fetchRoadmap();
            }}
          >
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (notFound || !roadmap) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-5 p-12 text-center">
          <Sparkles className="size-10 text-primary" />
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">Belum ada roadmap</h2>
            <p className="text-sm text-muted-foreground">
              Generate roadmap AI-mu sekarang berdasarkan hasil assessment.
            </p>
          </div>
          <Button size="lg" onClick={handleGenerate} disabled={generating}>
            {generating && <Loader2 className="animate-spin" />}
            {generating ? "Menyusun roadmap..." : "Generate Roadmap 🚀"}
          </Button>
          {generating && (
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Progress value={40} className="animate-pulse" />
              <p className="text-xs text-muted-foreground">
                AI sedang menyusun roadmap (bisa 10-30 detik)...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const totalTasks = roadmap.tasks.length;
  const doneTasks = roadmap.tasks.filter((t) => t.is_completed).length;
  const progressPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const weeks = Array.from(
    new Set(roadmap.tasks.map((t) => t.week).sort((a, b) => a - b))
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Roadmap 🗺️</h1>
            <Badge variant="secondary">
              {roadmap.content?.source === "fallback" ? "Templated" : "AI"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Target:{" "}
            <span className="font-medium text-foreground">
              {roadmap.target_career}
            </span>{" "}
            · {roadmap.duration_weeks} minggu
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowRegenerate((v) => !v)}
        >
          <RefreshCw /> Regenerate
        </Button>
      </div>

      {showRegenerate && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <label
              htmlFor="instructions"
              className="text-sm font-medium"
            >
              Instruksi tambahan (opsional)
            </label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              placeholder="Contoh: fokus pada React dan TypeScript, saya sudah menguasai HTML/CSS"
              className="border-input bg-background placeholder:text-muted-foreground flex w-full rounded-md border px-3 py-2 text-sm outline-none"
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRegenerate}
                disabled={generating}
                variant="destructive"
                size="sm"
              >
                {generating && <Loader2 className="animate-spin" />}
                {generating ? "Membuat ulang..." : "Ya, regenerate"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRegenerate(false)}
              >
                Batal
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ⚠️ Roadmap lama akan ditimpa dengan yang baru.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progres keseluruhan</span>
            <span>
              {doneTasks}/{totalTasks} task · {progressPct}%
            </span>
          </div>
          <Progress value={progressPct} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-5">
        {weeks.map((week) => {
          const weekTasks = roadmap.tasks.filter((t) => t.week === week);
          const weekDone = weekTasks.filter((t) => t.is_completed).length;
          const weekPct = Math.round((weekDone / weekTasks.length) * 100);
          return (
            <Card key={week}>
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Minggu {week}</h3>
                  <span className="text-xs text-muted-foreground">
                    {weekDone}/{weekTasks.length} selesai
                  </span>
                </div>
                <Progress value={weekPct} className="h-1.5" />
                <div className="flex flex-col gap-2">
                  {weekTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-md border p-3"
                    >
                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        disabled={updatingId === task.id}
                        aria-label={
                          task.is_completed
                            ? `Tandai belum selesai: ${task.title}`
                            : `Tandai selesai: ${task.title}`
                        }
                        className="mt-0.5 shrink-0"
                      >
                        {updatingId === task.id ? (
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        ) : task.is_completed ? (
                          <CheckCircle2 className="size-5 text-primary" />
                        ) : (
                          <Circle className="size-5 text-muted-foreground" />
                        )}
                      </button>

                      {editingId === task.id ? (
                        <div className="flex min-w-0 flex-1 flex-col gap-2">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="border-input bg-background rounded-md border px-2 py-1 text-sm outline-none"
                            aria-label="Judul task"
                          />
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={2}
                            className="border-input bg-background placeholder:text-muted-foreground rounded-md border px-2 py-1 text-xs outline-none"
                            aria-label="Deskripsi task"
                            placeholder="Deskripsi (opsional)"
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => saveEdit(task)}
                              disabled={updatingId === task.id || !editTitle.trim()}
                            >
                              {updatingId === task.id ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <Check />
                              )}
                              Simpan
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              <X /> Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={
                                task.is_completed
                                  ? "text-sm text-muted-foreground line-through"
                                  : "text-sm font-medium"
                              }
                            >
                              {task.title}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(task)}
                                aria-label={`Edit task: ${task.title}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Pencil className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task)}
                                aria-label={`Hapus task: ${task.title}`}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground">
                              {task.description}
                            </p>
                          )}
                          {task.resources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {task.resources.slice(0, 3).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="size-3" />
                                  Resource {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {addingWeek === week ? (
                    <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
                      <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Judul task baru"
                        aria-label="Judul task baru"
                        className="border-input bg-background rounded-md border px-2 py-1 text-sm outline-none"
                      />
                      <textarea
                        value={newTaskDesc}
                        onChange={(e) => setNewTaskDesc(e.target.value)}
                        rows={2}
                        placeholder="Deskripsi (opsional)"
                        aria-label="Deskripsi task baru"
                        className="border-input bg-background placeholder:text-muted-foreground rounded-md border px-2 py-1 text-xs outline-none"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAddTask(week)}
                          disabled={updatingId === "new" || !newTaskTitle.trim()}
                        >
                          {updatingId === "new" && <Loader2 className="animate-spin" />}
                          Tambah
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingWeek(null);
                            setNewTaskTitle("");
                            setNewTaskDesc("");
                          }}
                        >
                          Batal
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingWeek(week)}
                      className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      <Plus className="size-3.5" /> Tambah Task
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
