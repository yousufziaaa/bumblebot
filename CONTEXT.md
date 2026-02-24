# BumbleBot Dashboard — SYDE 462 Team 22

## What this is
Next.js + TypeScript frontend for a greenhouse tomato yield estimation system.
Cart-based CV system that detects tomato flowers and classifies their growth stage.

## Backend
Live API: https://deenp03-capstone-backend.hf.space
Docs: https://huggingface.co/spaces/deenp03/capstone-backend

## Key response schema (POST /api/classify)
{
  id, image_path,
  location: { latitude, longitude },
  timestamp,
  flowers: [{ bounding_box: [x,y,w,h], stage: 0|1|2, confidence }],
  flower_count,
  stage_summary
}
// Stages: 0=Bud, 1=Anthesis, 2=Post-Anthesis

## Structure
lib/api.ts         — typed API client
components/
  ClassifyView.tsx — drag/drop upload → bbox overlay + stage breakdown
  DashboardView.tsx — heatmap + stats (heatmap endpoint TBD)
  HistoryView.tsx  — past classifications list
  Sidebar.tsx      — nav + live API health check