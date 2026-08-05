import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const { targetCareer, currentSkills, learningHours, deadline, experience } =
    body;

  if (typeof targetCareer !== "string" || !targetCareer) {
    return NextResponse.json(
      { error: "Field targetCareer wajib diisi." },
      { status: 400 }
    );
  }
  if (typeof currentSkills !== "string" || currentSkills.length < 2) {
    return NextResponse.json(
      { error: "Field currentSkills wajib diisi." },
      { status: 400 }
    );
  }
  if (typeof learningHours !== "string" || !learningHours) {
    return NextResponse.json(
      { error: "Field learningHours wajib diisi." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      user_id: user.id,
      target_career: targetCareer,
      current_skills: currentSkills,
      learning_hours: learningHours,
      deadline: deadline || null,
      experience: experience || null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
