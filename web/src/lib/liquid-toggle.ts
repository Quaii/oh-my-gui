// Adapted from the user-supplied Amicro LiquidToggle (MIT).
const BLOB_POINTS = 12;
export function buildBlobPath(
  width: number,
  height: number,
  t: number,
  stretch: number
): string {
  // The blob's base centerX is interpolated between left and right.
  const padding = 4;
  const leftX = padding + (height - padding * 2) / 2;
  const rightX = width - padding - (height - padding * 2) / 2;
  const cy = height / 2;
  const baseRadius = (height - padding * 2) / 2;

  // Travel axis: stretch elongates along X based on velocity of t change.
  // We blend stretch into the X radius only.
  const stretchX = 1 + stretch * 0.35;
  const stretchY = 1 - stretch * 0.12;
  const radiusX = baseRadius * stretchX;
  const radiusY = baseRadius * stretchY;

  const cx = leftX + (rightX - leftX) * t;

  // Generate N anchors on the elliptical perimeter with a very subtle
  // wobble that activates only when the blob is moving (stretch > 0).
  // At rest the blob is a perfect circle/oval — clean, no facets.
  const points: Array<[number, number]> = [];
  for (let i = 0; i < BLOB_POINTS; i++) {
    const angle = (Math.PI * 2 * i) / BLOB_POINTS - Math.PI / 2;
    // Wobble scales with stretch so the resting shape is purely circular.
    const wobble = 1 + stretch * 0.18 * Math.sin(angle * 3 + t * Math.PI * 2);
    const x = cx + Math.cos(angle) * radiusX * wobble;
    const y = cy + Math.sin(angle) * radiusY * wobble;
    points.push([x, y]);
  }

  // Build a closed smooth path with quadratic Béziers. Each anchor
  // serves as a curve handle for the next segment: the endpoint of
  // segment i is the midpoint between anchors i and i+1, and the
  // control point is anchor i+1. This is the standard "midpoint
  // smoothing" technique — every curve passes through the same set of
  // midpoints, so the silhouette is C1-continuous and rotationally
  // symmetric.
  const mid = (a: [number, number], b: [number, number]): [number, number] => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];

  // Start at the midpoint between the last and first anchor.
  const start = mid(points[points.length - 1], points[0]);
  let d = `M ${start[0].toFixed(2)} ${start[1].toFixed(2)}`;
  for (let i = 0; i < BLOB_POINTS; i++) {
    const ctrl = points[i];
    const next = points[(i + 1) % BLOB_POINTS];
    const end = mid(ctrl, next);
    d += ` Q ${ctrl[0].toFixed(2)} ${ctrl[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
  }
  d += ' Z';
  return d;
}
