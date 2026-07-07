// Small pure stats for the analytics dashboard (.omc/plans/mvp-scope-screens.md
// §4.4). Kept separate so the correlation math is unit-testable and NULL
// exclusion is explicit.

export interface XY {
  x: number;
  y: number;
}

// Pearson correlation over paired points. Returns null when there are fewer than
// two points or either variable has zero variance (correlation undefined).
// Callers must drop 미측정(NULL) pairs before calling (§4.4 상관 NULL 제외).
export function pearson(points: readonly XY[]): number | null {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  const mx = sx / n;
  const my = sy / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (const p of points) {
    const dx = p.x - mx;
    const dy = p.y - my;
    cov += dx * dy;
    vx += dx * dx;
    vy += dy * dy;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}
