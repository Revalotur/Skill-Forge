import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { analyzeCv } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Data upload tidak valid." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File PDF wajib diunggah." }, { status: 400 });
  }

  const fd = new FormData();
  fd.append("user_id", user.id);
  fd.append("target_career", String(form.get("target_career") ?? ""));
  fd.append("file", file);

  try {
    const result = await analyzeCv(fd);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menganalisis CV." },
      { status }
    );
  }
}