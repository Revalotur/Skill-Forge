import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { analyzeGithub } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  if (!username) {
    return NextResponse.json({ error: "Username GitHub wajib diisi." }, { status: 400 });
  }

  try {
    const result = await analyzeGithub(user.id, username);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menganalisis GitHub." },
      { status }
    );
  }
}
