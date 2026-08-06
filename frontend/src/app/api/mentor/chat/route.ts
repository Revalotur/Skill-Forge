import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sendMentorChat } from "@/lib/api";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const query = String(body.query ?? "");
  const messages = Array.isArray(body.messages) ? body.messages : [];

  try {
    const result = await sendMentorChat(user.id, messages, query);
    return NextResponse.json(result);
  } catch (err) {
    const status =
      err instanceof Error && "status" in err
        ? (err as { status: number }).status
        : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menghubungi AI Mentor." },
      { status }
    );
  }
}
