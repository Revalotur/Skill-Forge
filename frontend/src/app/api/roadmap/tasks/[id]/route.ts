import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { updateTask } from "@/lib/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const { id } = await params;

  let body: { is_completed?: boolean; title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  if (
    typeof body?.is_completed !== "boolean" &&
    typeof body?.title !== "string" &&
    typeof body?.description !== "string"
  ) {
    return NextResponse.json(
      { error: "Tidak ada field yang valid untuk di-update." },
      { status: 400 }
    );
  }

  try {
    const task = await updateTask(id, body);
    return NextResponse.json(task);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal update task." },
      { status }
    );
  }
}
