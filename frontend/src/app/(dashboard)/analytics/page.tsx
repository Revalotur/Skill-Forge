import { AnalyticsView } from "@/components/analytics/analytics-view";

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Statistik 📊</h1>
        <p className="text-muted-foreground">
          Visualisasi aktivitas belajar, streak, dan distribusi materi.
        </p>
      </div>
      <AnalyticsView />
    </div>
  );
}
