import { GithubAnalyzer } from "@/components/github/github-analyzer";

export default function GithubPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">GitHub Analyzer 🚀</h1>
        <p className="text-muted-foreground">
          Analisis profil GitHub-mu: README, struktur project, tech stack, dan
          best practices.
        </p>
      </div>
      <GithubAnalyzer />
    </div>
  );
}
