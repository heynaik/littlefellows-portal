// src/utils/date.ts
export function fmtDate(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";
  const d = new Date(typeof value === "number" ? value : value);
  return d.toLocaleDateString();
}
