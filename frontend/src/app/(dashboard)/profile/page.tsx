import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Profil 👤</h1>
        <p className="text-muted-foreground">Detail akun SkillForge kamu.</p>
      </div>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
          <CardDescription>
            Data diambil dari akun autentikasi kamu.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Nama</span>
            <span className="font-medium">
              {user?.user_metadata?.name ?? "—"}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Provider</span>
            <span className="font-medium">
              {user?.app_metadata?.provider ?? "email"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
