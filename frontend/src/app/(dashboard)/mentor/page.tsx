import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MentorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">AI Mentor 🤖</h1>
        <p className="text-muted-foreground">
          Chat dengan AI mentor yang memahami konteks roadmapmu.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Segera hadir</CardTitle>
          <CardDescription>
            Fitur AI Mentor tersedia pada Sprint 3.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
