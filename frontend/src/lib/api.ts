import { backendApiPath, INTERNAL_API_KEY } from "@/lib/config";

export class BackendError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(backendApiPath(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-key": INTERNAL_API_KEY,
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `Backend error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) message = String(body.detail);
    } catch {
      // ignore
    }
    throw new BackendError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type RoadmapTask = {
  id: string;
  roadmap_id: string;
  week: number;
  title: string;
  description: string;
  resources: string[];
  is_completed: boolean;
  completed_at: string | null;
};

export type Roadmap = {
  id: string;
  user_id: string;
  assessment_id: string | null;
  target_career: string;
  duration_weeks: number;
  content: {
    source?: "gemini" | "fallback";
    weeks?: {
      week: number;
      title: string;
      tasks: { title: string; description: string; resources: string[] }[];
    }[];
  };
  status: "generating" | "ready" | "failed";
  created_at: string;
  updated_at: string;
  tasks: RoadmapTask[];
};

export type RoadmapSummary = {
  id: string;
  target_career: string;
  duration_weeks: number;
  status: string;
  created_at: string;
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
};

export async function generateRoadmap(userId: string) {
  return request<Roadmap>("/roadmaps/generate", {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

export async function regenerateRoadmap(userId: string, instructions?: string) {
  return request<Roadmap>("/roadmaps/generate", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, instructions: instructions ?? null }),
  });
}

export async function getLatestRoadmap(userId: string) {
  return request<Roadmap>(`/roadmaps/latest?user_id=${userId}`);
}

export async function getRoadmapSummary(userId: string) {
  return request<RoadmapSummary>(`/roadmaps/summary?user_id=${userId}`);
}

export async function updateTaskStatus(taskId: string, isCompleted: boolean) {
  return request<RoadmapTask>(`/roadmap_tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_completed: isCompleted }),
  });
}

export async function updateTask(
  taskId: string,
  patch: { is_completed?: boolean; title?: string; description?: string }
) {
  return request<RoadmapTask>(`/roadmap_tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export type DailyMission = {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

export type Streak = {
  current_streak: number;
  longest_streak: number;
  missions_completed: number;
  today_completed: boolean;
};

export async function getTodayMission(userId: string) {
  return request<DailyMission>(`/missions/today?user_id=${userId}`);
}

export async function updateMission(missionId: string, isCompleted: boolean) {
  return request<DailyMission>(`/missions/${missionId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_completed: isCompleted }),
  });
}

export async function getStreak(userId: string) {
  return request<Streak>(`/missions/streak?user_id=${userId}`);
}

export async function getMissionHistory(userId: string) {
  return request<DailyMission[]>(`/missions/history?user_id=${userId}`);
}

export type MentorMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MentorReply = {
  reply: string;
  source: "gemini" | "fallback";
};

export async function sendMentorChat(
  userId: string,
  messages: MentorMessage[],
  query: string
) {
  return request<MentorReply>("/mentor/chat", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, messages, query }),
  });
}

export type Analytics = {
  total_tasks: number;
  completed_tasks: number;
  progress_percent: number;
  current_streak: number;
  longest_streak: number;
  missions_completed: number;
  last_7_days: { date: string; label: string; completed: number }[];
  weekly_distribution: {
    week: number;
    label: string;
    total: number;
    completed: number;
  }[];
  recent_activity: { title: string; week: number; completed_at: string }[];
};

export async function getAnalytics(userId: string) {
  return request<Analytics>(`/analytics?user_id=${userId}`);
}

export type GithubAnalysis = {
  id: string;
  username: string;
  analysis: {
    username: string;
    source: "github";
    profile: {
      name: string;
      bio: string;
      avatar_url: string;
      followers: number;
      following: number;
      public_repos: number;
      location: string;
      blog: string;
      html_url: string;
    };
    repos: {
      name: string;
      description: string;
      stars: number;
      forks: number;
      language: string | null;
      is_fork: boolean;
      pushed_at: string | null;
      has_readme: boolean;
      has_license: boolean;
      has_ci: boolean;
      has_tests: boolean;
    }[];
    tech_stack: string[];
    best_practices: {
      readme_count: number;
      license_count: number;
      ci_count: number;
      test_count: number;
    };
    score: number;
    recommendations: string[];
  };
  created_at: string;
};

export type CareerGap = {
  target_career: string;
  readiness_score: number;
  required_skills: string[];
  current_skills: string[];
  missing_skills: string[];
  roadmap_progress: number;
  recommendations: string[];
};

export async function analyzeGithub(userId: string, username: string) {
  return request<GithubAnalysis>("/github/analyze", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, username }),
  });
}

export async function getLatestGithub(userId: string) {
  return request<GithubAnalysis>(`/github/latest?user_id=${userId}`);
}

export async function getCareerGap(userId: string) {
  return request<CareerGap>(`/career-gap?user_id=${userId}`);
}
