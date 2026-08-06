import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function isSafeNextPath(next: string | null): boolean {
  if (!next || !next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (next.startsWith("/\\")) return false;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next)) return false;
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const rawNext = searchParams.get("next");
  const next = isSafeNextPath(rawNext) ? rawNext : "/dashboard";

  const toError = (message: string) => {
    const url = `${origin}/auth/auth-code-error`;
    return NextResponse.redirect(`${url}?message=${encodeURIComponent(message)}`);
  };

  if (error) {
    return toError(
      errorDescription || error || "Terjadi kendala saat memverifikasi akun."
    );
  }

  if (!code) {
    return toError("Kode verifikasi tidak ditemukan pada tautan.");
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    return toError(
      exchangeError.message || "Kode verifikasi tidak valid atau kedaluwarsa."
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
