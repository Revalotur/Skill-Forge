import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RoadmapPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Roadmap 🗺️</h1>
        <p className="text-muted-foreground">
          Roadmap belajarmu akan muncul di sini setelah assessment dan
          generate dari AI.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Belum ada roadmap</CardTitle>
          <CardDescription>
            Selesaikan assessment terlebih dahulu untuk membuat roadmap.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
