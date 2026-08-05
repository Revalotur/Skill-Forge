"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithGoogle, signUpWithEmail } from "@/app/auth/actions";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password !== confirm) {
      setError("Password dan konfirmasi tidak sama.");
      setLoading(false);
      return;
    }
    const res = await signUpWithEmail(formData);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
    } else {
      setSuccess(
        "Berhasil mendaftar! Cek emailmu untuk verifikasi sebelum masuk."
      );
      router.push("/login");
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    await signInWithGoogle();
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Buat akun</CardTitle>
        <CardDescription>Mulai roadmap belajarmu sekarang</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loading}
          onClick={onGoogle}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <span aria-hidden="true">G</span>
          )}
          Daftar dengan Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          atau
          <span className="h-px flex-1 bg-border" />
        </div>
        <form onSubmit={onEmailSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm">Konfirmasi password</Label>
            <Input id="confirm" name="confirm" type="password" required />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400" role="status">
              {success}
            </p>
          )}
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="animate-spin" />}
            Daftar
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Sudah punya akun?{" "}
        <Link href="/login" className="ml-1 font-medium text-primary">
          Masuk
        </Link>
      </CardFooter>
    </Card>
  );
}
