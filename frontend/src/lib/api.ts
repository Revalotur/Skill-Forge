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
