import { AssessmentForm } from "@/components/assessment/assessment-form";

export default function AssessmentPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Skill Assessment 🎯</h1>
        <p className="text-muted-foreground">
          Jawab 5 pertanyaan singkat agar AI bisa menyusun roadmap yang sesuai.
        </p>
      </div>
      <AssessmentForm />
    </div>
  );
}
