/** Pixels of wheel travel for one full zoom level. A typical notch is ~100px, so it moves less than the +/- buttons. */
export const MAP_WHEEL_PX_PER_ZOOM = 220;

export function wheelZoomStep(deltaY: number, deltaMode: number, viewportHeight: number) {
  let pixels = deltaY;
  if (deltaMode === 1) {
    pixels *= 16;
  } else if (deltaMode === 2) {
    pixels *= viewportHeight || 400;
  }
  if (!Number.isFinite(pixels) || pixels === 0) {
    return 0;
  }
  const step = -pixels / MAP_WHEEL_PX_PER_ZOOM;
  return Math.max(-1, Math.min(1, step));
}

export function clampMapZoom(zoom: number, minZoom: number, maxZoom: number) {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}
