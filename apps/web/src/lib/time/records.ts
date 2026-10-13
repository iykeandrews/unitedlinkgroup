export interface TimeBreak {
  startTime: string;
  endTime?: string | null;
  type?: string;
}
export function workedHours(
  start: string,
  end?: string | null,
  breaks: TimeBreak[] = [],
  now = new Date(),
): number {
  const from = new Date(start).getTime();
  const to = end ? new Date(end).getTime() : now.getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return 0;
  const ranges = breaks
    .map((b) => [
      Math.max(from, new Date(b.startTime).getTime()),
      Math.min(to, b.endTime ? new Date(b.endTime).getTime() : to),
    ])
    .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .sort((a, b) => a[0] - b[0]);
  let deducted = 0,
    previousEnd = from;
  for (const [a, b] of ranges) {
    deducted += Math.max(0, b - Math.max(a, previousEnd));
    previousEnd = Math.max(previousEnd, b);
  }
  return Math.max(0, to - from - deducted) / 3600000;
}
export function csvText(rows: unknown[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            let text = String(value ?? "");
            if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
            return '"' + text.replace(/"/g, '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}
export function downloadCsv(rows: unknown[][], filename: string) {
  const url = URL.createObjectURL(
    new Blob([csvText(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
