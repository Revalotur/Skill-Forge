import { CvAnalyzer } from "@/components/cv/cv-analyzer";

export default function CvPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">CV Analyzer 📄</h1>
        <p className="text-muted-foreground">
          Upload CV dan dapatkan skor ATS, skill gap terhadap target karier, dan
          saran perbaikan.
        </p>
      </div>
      <CvAnalyzer />
    </div>
  );
}