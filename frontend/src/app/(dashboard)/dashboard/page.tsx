import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Halo, selamat datang! 👋</h1>
        <p className="text-muted-foreground">
          {user?.email ?? "Pengguna"} — Dashboard akan menampilkan progres,
          target, dan estimasi selesai setelah roadmap dibuat.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Progres", value: "0%", emoji: "📈" },
          { label: "Target Karier", value: "—", emoji: "🎯" },
          { label: "Estimasi Selesai", value: "—", emoji: "⏳" },
          { label: "Streak", value: "0 hari", emoji: "🔥" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">
                  {s.label}
                </span>
                <span className="text-2xl font-bold">{s.value}</span>
              </div>
              <span className="text-3xl" aria-hidden="true">
                {s.emoji}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mulai dengan Assessment</CardTitle>
          <CardDescription>
            Isi assessment singkat agar AI bisa menyusun roadmap yang sesuai
            untukmu.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
