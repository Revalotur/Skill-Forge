import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { regenerateRoadmap } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  let instructions: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.instructions === "string") {
      instructions = body.instructions;
    }
  } catch {
    // ignore, instructions opsional
  }

  try {
    const roadmap = await regenerateRoadmap(user.id, instructions ?? undefined);
    return NextResponse.json(roadmap);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal regenerate roadmap." },
      { status }
    );
  }
}
