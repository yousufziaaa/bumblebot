const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://deenp03-capstone-backend.hf.space";

export type FlowerStage = 0 | 1 | 2;

export const STAGE_LABELS: Record<number, string> = {
  0: "Bud",
  1: "Anthesis",
  2: "Post-Anthesis",
};

export const STAGE_COLORS: Record<number, string> = {
  0: "#22c55e",
  1: "#eab308",
  2: "#f97316",
};

export interface Flower {
  bounding_box: [number, number, number, number]; // [x, y, width, height]
  stage: number;
  confidence: number;
}

export interface ClassificationResult {
  id: string;
  image_path: string;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  timestamp: string;
  flowers: Flower[];
  flower_count: number;
  stage_summary: Record<string, unknown>;
}

export interface HeatmapDataPoint {
  id: string;
  latitude: number | null;
  longitude: number | null;
  timestamp?: string;
  flowers?: Flower[];
  total_flowers?: number;
  flower_count?: number;
  stage_counts?: Record<string, number>;
  [key: string]: unknown;
}

export interface HeatmapData {
  zones?: {
    id: string;
    label: string;
    count: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  data_points?: HeatmapDataPoint[];
  total_records?: number;
  total_count?: number;
  [key: string]: unknown;
}

export interface VideoClassification {
  record_id: string;
  status: string;
  timestamp?: string;
  frame_count?: number;
  total_count?: number;
  [key: string]: unknown;
}

async function throwWithDetail(res: Response, fallback: string): Promise<never> {
  let detail = `${fallback} (${res.status})`;
  try {
    const body = await res.json();
    if (body?.detail) detail = body.detail;
    else if (body?.message) detail = body.message;
  } catch {
    // body wasn't JSON — keep the fallback
  }
  throw new Error(detail);
}

export async function classifyImage(
  file: File,
  latitude?: number,
  longitude?: number
): Promise<ClassificationResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (latitude !== undefined) formData.append("latitude", String(latitude));
  if (longitude !== undefined) formData.append("longitude", String(longitude));

  const res = await fetch(`${BASE_URL}/api/classify`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) await throwWithDetail(res, "Classification failed");
  return res.json();
}

export async function getClassification(id: string): Promise<ClassificationResult> {
  const res = await fetch(`${BASE_URL}/api/classifications/${id}`);
  if (!res.ok) await throwWithDetail(res, "Failed to fetch classification");
  return res.json();
}

export async function getHeatmapData(): Promise<HeatmapData> {
  const res = await fetch(`${BASE_URL}/api/heatmap-data`);
  if (!res.ok) await throwWithDetail(res, "Heatmap fetch failed");
  return res.json();
}

export async function getImage(id: string): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/images/${id}`);
  if (!res.ok) await throwWithDetail(res, "Image fetch failed");
  return res.blob();
}

export async function listVideoClassifications(): Promise<VideoClassification[]> {
  const res = await fetch(`${BASE_URL}/api/video-classifications`);
  if (!res.ok) await throwWithDetail(res, "Failed to fetch history");
  return res.json();
}

export async function deleteClassification(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/classifications/${id}`, { method: "DELETE" });
  if (!res.ok) await throwWithDetail(res, "Delete failed");
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}
