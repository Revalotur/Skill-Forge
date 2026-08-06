import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { generateRoadmap } from "@/lib/api";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  try {
    const roadmap = await generateRoadmap(user.id);
    return NextResponse.json(roadmap);
  } catch (err) {
    const status = err instanceof Error && "status" in err ? (err as { status: number }).status : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal generate roadmap." },
      { status }
    );
  }
}
