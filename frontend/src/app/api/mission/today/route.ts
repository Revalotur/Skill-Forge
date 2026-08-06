import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getTodayMission } from "@/lib/api";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  try {
    const mission = await getTodayMission(user.id);
    return NextResponse.json(mission);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil misi harian." },
      { status }
    );
  }
}
