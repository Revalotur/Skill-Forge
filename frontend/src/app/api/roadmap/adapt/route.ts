import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { adaptRoadmap } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  try {
    const result = await adaptRoadmap({
      user_id: user.id,
      roadmap_id: body.roadmap_id,
    });
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengadaptasi roadmap." },
      { status }
    );
  }
}
