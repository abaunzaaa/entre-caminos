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

/** Centro visual de los recuerdos. Medellín queda aquí; el norte sube y el oriente va a la derecha. */
export const MEDELLIN_REFERENCE = { latitude: 6.2442, longitude: -75.5812 } as const;

const PIN_FIELD = { left: 22, right: 84, top: 22, bottom: 78 } as const;
const PIN_CENTER = {
  xPercent: (PIN_FIELD.left + PIN_FIELD.right) / 2,
  yPercent: (PIN_FIELD.top + PIN_FIELD.bottom) / 2,
};
const PIN_MIN_GAP = 12.4;

type VisitedPinInput = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

function clampPercent(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hasVisitedPoint(stop: VisitedPinInput): stop is VisitedPinInput & { latitude: number; longitude: number } {
  if (stop.latitude == null || stop.longitude == null) {
    return false;
  }
  if (!Number.isFinite(stop.latitude) || !Number.isFinite(stop.longitude)) {
    return false;
  }
  if (Math.abs(stop.latitude) > 90 || Math.abs(stop.longitude) > 180) {
    return false;
  }
  return Math.abs(stop.latitude) > 0.000001 || Math.abs(stop.longitude) > 0.000001;
}

/** Agranda los grados cortos para que Sabaneta no caiga encima de Medellín, y frena los viajes largos. */
function spreadDegrees(delta: number) {
  const magnitude = Math.abs(delta);
  if (magnitude < 0.0008) {
    return 0;
  }
  return Math.sign(delta) * Math.sqrt(magnitude / 0.045);
}

function directionFromMedellin(latitude: number, longitude: number): MapPercent {
  const east = spreadDegrees(longitude - MEDELLIN_REFERENCE.longitude) * 8.2;
  const north = spreadDegrees(latitude - MEDELLIN_REFERENCE.latitude) * 9.4;
  return {
    xPercent: clampPercent(PIN_CENTER.xPercent + east, PIN_FIELD.left, PIN_FIELD.right),
    yPercent: clampPercent(PIN_CENTER.yPercent - north, PIN_FIELD.top, PIN_FIELD.bottom),
  };
}

function pinGap(left: MapPercent, right: MapPercent) {
  return Math.hypot((left.xPercent - right.xPercent) * 1.65, left.yPercent - right.yPercent);
}

function clusterOffset(index: number) {
  if (index === 0) {
    return { xPercent: 0, yPercent: 0 };
  }
  const angle = index * 2.399963229728653;
  const radius = 8.6 + (index - 1) * 2.55;
  return {
    xPercent: Math.cos(angle) * radius * 0.7,
    yPercent: Math.sin(angle) * radius,
  };
}

function sameZone(left: MapPercent, right: MapPercent) {
  return pinGap(left, right) < 3.6;
}

/**
 * Coloca cada experiencia según su dirección respecto a Medellín
 * y separa las que caerían en el mismo punto. El resultado no cambia entre renders.
 */
export function placeVisitedPins(stops: VisitedPinInput[]): MapPercent[] {
  const geographic = stops.map((stop) =>
    hasVisitedPoint(stop) ? directionFromMedellin(stop.latitude, stop.longitude) : { ...PIN_CENTER },
  );
  const placed = geographic.map((point) => ({ ...point }));
  const seen = new Set<number>();
  for (let index = 0; index < placed.length; index += 1) {
    if (seen.has(index)) {
      continue;
    }
    const members = [index];
    seen.add(index);
    for (let other = index + 1; other < placed.length; other += 1) {
      if (seen.has(other) || !sameZone(geographic[index], geographic[other])) {
        continue;
      }
      members.push(other);
      seen.add(other);
    }
    const ordered = [...members].sort((left, right) => stops[left].id.localeCompare(stops[right].id));
    ordered.forEach((member, order) => {
      const offset = clusterOffset(order);
      placed[member] = {
        xPercent: clampPercent(geographic[member].xPercent + offset.xPercent, PIN_FIELD.left, PIN_FIELD.right),
        yPercent: clampPercent(geographic[member].yPercent + offset.yPercent, PIN_FIELD.top, PIN_FIELD.bottom),
      };
    });
  }
  for (let pass = 0; pass < 28; pass += 1) {
    let moved = false;
    for (let index = 0; index < placed.length; index += 1) {
      for (let other = 0; other < index; other += 1) {
        const dx = (placed[index].xPercent - placed[other].xPercent) * 1.65;
        const dy = placed[index].yPercent - placed[other].yPercent;
        const distance = Math.hypot(dx, dy);
        if (distance >= PIN_MIN_GAP) {
          continue;
        }
        const safe = distance < 0.05 ? 0.05 : distance;
        const push = (PIN_MIN_GAP - distance) / 2;
        const stepX = (dx / safe / 1.65) * push;
        const stepY = (dy / safe) * push;
        placed[index].xPercent += stepX;
        placed[index].yPercent += stepY;
        placed[other].xPercent -= stepX;
        placed[other].yPercent -= stepY;
        moved = true;
      }
    }
    for (const point of placed) {
      point.xPercent = clampPercent(point.xPercent, PIN_FIELD.left, PIN_FIELD.right);
      point.yPercent = clampPercent(point.yPercent, PIN_FIELD.top, PIN_FIELD.bottom);
    }
    if (!moved) {
      break;
    }
  }
  return placed.map((point) => ({
    xPercent: Math.round(point.xPercent * 100) / 100,
    yPercent: Math.round(point.yPercent * 100) / 100,
  }));
}
