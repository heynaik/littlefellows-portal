// src/lib/stages.ts
export const STAGES = [
  "Uploaded",
  "Assigned to Vendor",
  "Printing",
  "Quality Check",
  "Packed",
  "Shipped to Admin",
  "Received by Admin",
  "Final Packed for Customer",
  "Shipped to Customer",
  "Delivered",
] as const;

export type Stage = (typeof STAGES)[number];

export function nextStageOptions(current: string): Stage[] {
  const i = STAGES.indexOf(current as Stage);
  if (i < 0) return STAGES as unknown as Stage[];
  return STAGES.slice(i + 1) as unknown as Stage[];
}

export function stageColor(stage: string) {
  const map: Record<string, string> = {
    "Uploaded": "bg-gray-100 text-gray-700",
    "Assigned to Vendor": "bg-slate-100 text-slate-700",
    "Printing": "bg-blue-100 text-blue-700",
    "Quality Check": "bg-cyan-100 text-cyan-700",
    "Packed": "bg-amber-100 text-amber-700",
    "Shipped to Admin": "bg-indigo-100 text-indigo-700",
    "Received by Admin": "bg-purple-100 text-purple-700",
    "Final Packed for Customer": "bg-pink-100 text-pink-700",
    "Shipped to Customer": "bg-teal-100 text-teal-700",
    "Delivered": "bg-emerald-100 text-emerald-700",
  };
  return map[stage] ?? "bg-gray-100 text-gray-700";
}