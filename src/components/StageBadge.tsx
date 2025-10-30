// src/components/StageBadge.tsx
"use client";
import { stageColor } from "../lib/stages";

export default function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${stageColor(stage)}`}>
      {stage}
    </span>
  );
}