export function isNewerVersion(latest: string, installed: string): boolean {
  if (!/^\d+\.\d+\.\d+$/.test(latest) || !/^\d+\.\d+\.\d+$/.test(installed))
    return false;
  const next = latest.split(".").map(Number),
    current = installed.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (next[i] !== current[i]) return next[i] > current[i];
  }
  return false;
}
