import { createClient } from "@/lib/supabase/server";
import { MentorChat } from "@/components/mentor/mentor-chat";

export default async function MentorPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">AI Mentor 🤖</h1>
        <p className="text-muted-foreground">
          {user?.email ?? "Pengguna"} — Chat dengan AI yang memahami konteks
          roadmap belajarmu.
        </p>
      </div>
      <MentorChat />
    </div>
  );
}
