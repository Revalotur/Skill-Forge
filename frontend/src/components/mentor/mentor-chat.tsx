"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MentorMessage } from "@/lib/api";

const SUGGESTIONS = [
  "Jelaskan materi pertama yang harus kupelajari",
  "Bagaimana cara tetap konsisten belajar?",
  "Rekomendasikan latihan praktik untukku",
  "Apa skill yang paling penting untuk targetku?",
];

export function MentorChat() {
  const [messages, setMessages] = useState<MentorMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const query = text.trim();
    if (!query || loading) return;
    setError(null);
    const history = [...messages];
    setMessages([...history, { role: "user", content: query }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/mentor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, query }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Gagal menghubungi AI Mentor.");
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col gap-4">
      <Card className="flex min-h-0 flex-1 flex-col">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
                <Bot className="size-7" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Halo! Aku AI Mentor-mu 🤖</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Aku memahami konteks roadmap belajarmu. Tanya apa saja tentang
                  materi, latihan, atau cara tetap konsisten.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => void send(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "flex justify-end"
                  : "flex justify-start"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "flex max-w-[80%] items-start gap-2"
                    : "flex max-w-[85%] items-start gap-2"
                }
              >
                {m.role === "assistant" && (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-4" />
                  </span>
                )}
                <div
                  className={
                    m.role === "user"
                      ? "rounded-2xl rounded-br-sm bg-gradient-to-r from-violet-600 to-fuchsia-500 px-4 py-2.5 text-sm text-white shadow-sm"
                      : "rounded-2xl rounded-bl-sm border bg-card px-4 py-2.5 text-sm"
                  }
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
                {m.role === "user" && (
                  <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    <User className="size-4" />
                  </span>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
              <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-2.5 text-sm">
                <Loader2 className="size-4 animate-spin" />
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya materi, minta tips, atau minta latihan..."
          disabled={loading}
          className="h-12 rounded-full px-5"
        />
        <Button type="submit" disabled={loading || !input.trim()} className="size-12 shrink-0 rounded-full" aria-label="Kirim">
          {loading ? <Loader2 className="animate-spin" /> : <Send className="size-5" />}
        </Button>
      </form>
    </div>
  );
}
