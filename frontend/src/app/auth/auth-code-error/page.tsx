import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const cleanMessage =
    message && !message.startsWith("http") ? message.slice(0, 200) : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <span className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" />
          </span>
          <CardTitle className="text-2xl">
            Tautan tidak valid atau kedaluwarsa
          </CardTitle>
          <CardDescription>
            Tautan verifikasi yang kamu buka tidak dapat diproses. Hal ini bisa
            terjadi karena tautan sudah pernah digunakan atau terlalu lama.
          </CardDescription>
        </CardHeader>
        {cleanMessage && (
          <CardContent>
            <p
              className="rounded-lg bg-muted p-3 text-sm text-muted-foreground"
              role="alert"
            >
              {cleanMessage}
            </p>
          </CardContent>
        )}
        <CardFooter className="flex justify-center gap-3">
          <Button asChild variant="outline">
            <Link href="/register">Kirim ulang tautan</Link>
          </Button>
          <Button asChild>
            <Link href="/login">Coba masuk</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
