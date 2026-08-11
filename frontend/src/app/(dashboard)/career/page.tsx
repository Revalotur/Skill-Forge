import { CareerGapView } from "@/components/career/career-gap-view";

export default function CareerPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Career Gap 🎯</h1>
        <p className="text-muted-foreground">
          Analisis skill gap dan skor kesiapan kerja untuk target kariermu.
        </p>
      </div>
      <CareerGapView />
    </div>
  );
}
