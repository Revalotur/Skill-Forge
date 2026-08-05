import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Statistik 📊</h1>
        <p className="text-muted-foreground">
          Visualisasi aktivitas belajar, streak, dan distribusi materi.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Belum ada data</CardTitle>
          <CardDescription>
            Statistik akan tampil setelah kamu mulai belajar dan menyelesaikan
            misi harian.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
