// src/components/StageDropdown.tsx
"use client";
import { nextStageOptions } from "../lib/stages";

export default function StageDropdown({
  current,
  onChange,
}: {
  current: string;
  onChange: (next: string) => void;
}) {
  const options = nextStageOptions(current);
  if (options.length === 0) return <span className="text-sm text-gray-400">No further</span>;
  return (
    <select
      className="rounded border px-2 py-1 text-sm"
      onChange={(e) => e.target.value && onChange(e.target.value)}
      defaultValue=""
    >
      <option value="" disabled>
        Change stage
      </option>
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}