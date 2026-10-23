/**
 * Marco de la ilustración dentro de fondovisitados.jpg (3168×1344).
 * Los porcentajes salen del recuadro opaco, no del archivo completo:
 * hay blanco a los lados y arriba.
 */
export const WORLD_COVER_FRAME = {
  left: 8.08,
  right: 92.23,
  top: 5.06,
  bottom: 99.85,
} as const;

export type MapPercent = {
  xPercent: number;
  yPercent: number;
};

/** Proyección equirectangular: el dibujo reparte el mundo en un rectángulo, sin agrandar los polos. */
export function coordinatesToMapPosition(latitude: number, longitude: number): MapPercent {
  const lng = Math.min(180, Math.max(-180, longitude));
  const lat = Math.min(90, Math.max(-90, latitude));
  const xSpan = WORLD_COVER_FRAME.right - WORLD_COVER_FRAME.left;
  const ySpan = WORLD_COVER_FRAME.bottom - WORLD_COVER_FRAME.top;
  return {
    xPercent: WORLD_COVER_FRAME.left + ((lng + 180) / 360) * xSpan,
    yPercent: WORLD_COVER_FRAME.top + ((90 - lat) / 180) * ySpan,
  };
}

export function coverCardPlacement(xPercent: number, yPercent: number) {
  return {
    vertical: yPercent < 36 ? "below" : "above",
    horizontal: xPercent > 70 ? "left" : xPercent < 30 ? "right" : "center",
  } as const;
}

/** Puestos fijos sobre los continentes de la ilustración. El orden no cambia al recargar. */
export const COVER_MEMORY_SLOTS: MapPercent[] = [
  { xPercent: 22, yPercent: 38 },
  { xPercent: 76, yPercent: 36 },
  { xPercent: 48, yPercent: 34 },
  { xPercent: 28, yPercent: 68 },
  { xPercent: 82, yPercent: 70 },
  { xPercent: 52, yPercent: 58 },
  { xPercent: 64, yPercent: 46 },
  { xPercent: 17, yPercent: 50 },
  { xPercent: 34, yPercent: 26 },
  { xPercent: 68, yPercent: 26 },
  { xPercent: 44, yPercent: 48 },
  { xPercent: 74, yPercent: 56 },
  { xPercent: 24, yPercent: 78 },
  { xPercent: 56, yPercent: 74 },
  { xPercent: 86, yPercent: 48 },
  { xPercent: 60, yPercent: 34 },
];

function slotDistance(left: MapPercent, right: MapPercent) {
  return Math.hypot((left.xPercent - right.xPercent) * 2.35, left.yPercent - right.yPercent);
}

/** Asigna un puesto estable por índice. Si faltan puestos, busca el hueco más libre del mapa. */
export function assignMemorySlots(count: number): MapPercent[] {
  const chosen: MapPercent[] = [];
  for (const slot of COVER_MEMORY_SLOTS) {
    if (chosen.length >= count) {
      break;
    }
    if (chosen.every((point) => slotDistance(point, slot) >= 16)) {
      chosen.push(slot);
    }
  }
  if (chosen.length >= count) {
    return chosen.slice(0, count);
  }
  const candidates: MapPercent[] = [];
  for (let y = 26; y <= 76; y += 6) {
    for (let x = 16; x <= 86; x += 5) {
      candidates.push({ xPercent: x, yPercent: y });
    }
  }
  while (chosen.length < count) {
    let best: MapPercent | null = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      const score = chosen.reduce((min, point) => Math.min(min, slotDistance(point, candidate)), Infinity);
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    if (!best) {
      break;
    }
    chosen.push(best);
  }
  return chosen.slice(0, count);
}

/** Separa pins que caerían encima, unos pocos píxeles, sin alejarlos de su coordenada. */
export function separateNearbyPins<T extends MapPercent>(points: T[], width: number, height: number, gap = 16, maxOffset = 12) {
  const placed = points.map((point) => ({
    ...point,
    x: width > 0 ? (point.xPercent / 100) * width : 0,
    y: height > 0 ? (point.yPercent / 100) * height : 0,
    offsetX: 0,
    offsetY: 0,
  }));
  if (width < 8 || height < 8) {
    return placed;
  }
  for (let index = 0; index < placed.length; index += 1) {
    for (let other = 0; other < index; other += 1) {
      const dx = placed[index].x + placed[index].offsetX - (placed[other].x + placed[other].offsetX);
      const dy = placed[index].y + placed[index].offsetY - (placed[other].y + placed[other].offsetY);
      const distance = Math.hypot(dx, dy);
      if (distance >= gap) {
        continue;
      }
      const angle = distance < 0.5 ? (index * Math.PI * 2) / Math.max(placed.length, 1) : Math.atan2(dy, dx);
      const push = (gap - distance) / 2;
      placed[index].offsetX += Math.cos(angle) * push;
      placed[index].offsetY += Math.sin(angle) * push;
      placed[other].offsetX -= Math.cos(angle) * push;
      placed[other].offsetY -= Math.sin(angle) * push;
    }
  }
  return placed.map((point) => {
    const distance = Math.hypot(point.offsetX, point.offsetY);
    if (distance <= maxOffset) {
      return point;
    }
    const scale = maxOffset / distance;
    return { ...point, offsetX: point.offsetX * scale, offsetY: point.offsetY * scale };
  });
}
