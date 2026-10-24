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
const PIN_MIN_GAP = 8;
const CENTER_GAP = 11.5;
const X_NUDGE = 1.8;

type VisitedPinInput = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

function clampPercent(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampLatitudeBand(yPercent: number, baseY: number, band: number) {
  return clampPercent(yPercent, Math.max(PIN_FIELD.top, baseY - band), Math.min(PIN_FIELD.bottom, baseY + band));
}

function clampCompassX(xPercent: number, baseX: number, anchorX: number) {
  const east = baseX - PIN_CENTER.xPercent;
  let next = clampPercent(xPercent, anchorX - X_NUDGE, anchorX + X_NUDGE);
  next = clampPercent(next, PIN_FIELD.left, PIN_FIELD.right);
  if (east > 1.2) {
    return Math.max(next, PIN_CENTER.xPercent + 0.6);
  }
  if (east < -1.2) {
    return Math.min(next, PIN_CENTER.xPercent - 0.6);
  }
  return next;
}

function latitudesDiffer(left: VisitedPinInput, right: VisitedPinInput) {
  if (!hasVisitedPoint(left) || !hasVisitedPoint(right)) {
    return false;
  }
  return Math.abs(left.latitude - right.latitude) > DISTINCT_LATITUDE;
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

/**
 * Distancia desde Medellín, no una proyección del mapamundi.
 * Norte/sur y este/oeste usan curvas distintas.
 * 0–2 km se quedan en el centro, 2–8 km se separan con suavidad,
 * y más lejos crece más hasta un tope que no cruza el mapa.
 * Brújula: N arriba, S abajo, O izquierda, E derecha.
 */
const KM_PER_DEGREE = 110.574;
/** El abanico de un mismo punto no puede cruzar al municipio siguiente. */
const SPIRAL_X = 6;
const SPIRAL_Y = 8.4;
const CLOUD_X = 6.6;
const CLOUD_Y = 9;
const CLOUD_KM = 3.4;
const COLLISION_Y = 1.4;
const DISTINCT_LATITUDE = 0.01;

function verticalMagnitude(kilometers: number) {
  if (kilometers <= 2) {
    return (kilometers / 2) * 1.6;
  }
  if (kilometers <= 8) {
    const t = (kilometers - 2) / 6;
    return 1.6 + t * 9.9;
  }
  if (kilometers <= 17) {
    const t = (kilometers - 8) / 9;
    return 11.5 + Math.pow(t, 0.72) * 15.2;
  }
  return Math.min(27.2, 26.7 + Math.sqrt(kilometers - 17) * 0.28);
}

function horizontalMagnitude(kilometers: number) {
  if (kilometers <= 2) {
    return (kilometers / 2) * 1.05;
  }
  if (kilometers <= 8) {
    const t = (kilometers - 2) / 6;
    return 1.05 + t * 2.15;
  }
  if (kilometers <= 22) {
    const t = (kilometers - 8) / 14;
    return 3.2 + Math.pow(t, 1.08) * 7.1;
  }
  return Math.min(15.5, 10.3 + Math.sqrt(kilometers - 22) * 0.95);
}

function axisMagnitude(kilometers: number, magnitudeOf: (value: number) => number) {
  const magnitude = Math.abs(kilometers);
  if (magnitude < 0.3) {
    return 0;
  }
  return Math.sign(kilometers) * magnitudeOf(magnitude);
}

function directionFromMedellin(latitude: number, longitude: number): MapPercent {
  const latScale = KM_PER_DEGREE;
  const lngScale = KM_PER_DEGREE * Math.cos((MEDELLIN_REFERENCE.latitude * Math.PI) / 180);
  const north = axisMagnitude((latitude - MEDELLIN_REFERENCE.latitude) * latScale, verticalMagnitude);
  const east = axisMagnitude((longitude - MEDELLIN_REFERENCE.longitude) * lngScale, horizontalMagnitude);
  return {
    xPercent: clampPercent(PIN_CENTER.xPercent + east, PIN_FIELD.left, PIN_FIELD.right),
    yPercent: clampPercent(PIN_CENTER.yPercent - north, PIN_FIELD.top, PIN_FIELD.bottom),
  };
}

function unitFromId(id: string) {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function clusterOffset(index: number, id: string) {
  if (index === 0) {
    return { xPercent: 0, yPercent: 0 };
  }
  const spin = unitFromId(id);
  const angle = index * 2.399963229728653 + (spin - 0.5) * 0.7;
  const wobble = 0.72 + unitFromId(`${id}:r`) * 0.52;
  const radius = (9.6 + (index - 1) * 1.55) * wobble;
  return {
    xPercent: clampPercent(Math.cos(angle) * radius * 0.7, -SPIRAL_X, SPIRAL_X),
    yPercent: clampPercent(Math.sin(angle) * radius, -SPIRAL_Y, SPIRAL_Y),
  };
}

function kilometersFromMedellin(latitude: number, longitude: number) {
  const latScale = KM_PER_DEGREE;
  const lngScale = KM_PER_DEGREE * Math.cos((MEDELLIN_REFERENCE.latitude * Math.PI) / 180);
  const north = (latitude - MEDELLIN_REFERENCE.latitude) * latScale;
  const east = (longitude - MEDELLIN_REFERENCE.longitude) * lngScale;
  return Math.hypot(north, east);
}

function isCentralStop(stop: VisitedPinInput) {
  if (!hasVisitedPoint(stop)) {
    return true;
  }
  return kilometersFromMedellin(stop.latitude, stop.longitude) <= CLOUD_KM;
}

function clampCentralX(xPercent: number) {
  return clampPercent(xPercent, PIN_CENTER.xPercent - CLOUD_X, PIN_CENTER.xPercent + CLOUD_X);
}

function clampCentralY(yPercent: number) {
  return clampPercent(yPercent, PIN_CENTER.yPercent - CLOUD_Y, PIN_CENTER.yPercent + CLOUD_Y);
}

function samePlace(left: VisitedPinInput, right: VisitedPinInput) {
  if (!hasVisitedPoint(left) || !hasVisitedPoint(right)) {
    return false;
  }
  return Math.abs(left.latitude - right.latitude) < 0.008 && Math.abs(left.longitude - right.longitude) < 0.008;
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
  const central = stops.map((stop) => isCentralStop(stop));
  const yBand = stops.map((_, index) => (central[index] ? CLOUD_Y : COLLISION_Y));
  const seen = new Set<number>();
  for (let index = 0; index < placed.length; index += 1) {
    if (seen.has(index)) {
      continue;
    }
    const members = [index];
    seen.add(index);
    for (let other = index + 1; other < placed.length; other += 1) {
      if (seen.has(other) || !samePlace(stops[index], stops[other])) {
        continue;
      }
      members.push(other);
      seen.add(other);
    }
    const ordered = [...members].sort((left, right) => stops[left].id.localeCompare(stops[right].id));
    const band = ordered.length > 1 ? SPIRAL_Y : central[ordered[0]] ? CLOUD_Y : COLLISION_Y;
    ordered.forEach((member, order) => {
      yBand[member] = band;
      const offset = clusterOffset(order, stops[member].id);
      placed[member] = {
        xPercent: clampPercent(geographic[member].xPercent + offset.xPercent, PIN_FIELD.left, PIN_FIELD.right),
        yPercent: clampLatitudeBand(geographic[member].yPercent + offset.yPercent, geographic[member].yPercent, band),
      };
    });
  }
  const anchors = placed.map((point) => ({ ...point }));
  for (let pass = 0; pass < 28; pass += 1) {
    let moved = false;
    for (let index = 0; index < placed.length; index += 1) {
      for (let other = 0; other < index; other += 1) {
        const bothCentral = central[index] && central[other];
        const gap = bothCentral ? CENTER_GAP : PIN_MIN_GAP;
        const dx = (placed[index].xPercent - placed[other].xPercent) * 1.65;
        const dy = placed[index].yPercent - placed[other].yPercent;
        const distance = Math.hypot(dx, dy);
        if (distance >= gap) {
          continue;
        }
        const safe = distance < 0.05 ? 0.05 : distance;
        const push = (gap - distance) / 2;
        let stepX = (dx / safe / 1.65) * push;
        let stepY = (dy / safe) * push;
        if (latitudesDiffer(stops[index], stops[other]) && !bothCentral) {
          stepY = 0;
          if (Math.abs(placed[index].xPercent - placed[other].xPercent) < 0.4 && hasVisitedPoint(stops[index]) && hasVisitedPoint(stops[other])) {
            const indexEast = stops[index].longitude - stops[other].longitude;
            const side = indexEast === 0 ? (stops[index].id.localeCompare(stops[other].id) >= 0 ? 1 : -1) : Math.sign(indexEast);
            stepX = side * (push + 0.35);
          }
        }
        placed[index].xPercent += stepX;
        placed[index].yPercent += stepY;
        placed[other].xPercent -= stepX;
        placed[other].yPercent -= stepY;
        moved = true;
      }
    }
    for (let index = 0; index < placed.length; index += 1) {
      placed[index].xPercent = central[index]
        ? clampCentralX(placed[index].xPercent)
        : clampCompassX(placed[index].xPercent, geographic[index].xPercent, anchors[index].xPercent);
      const yPercent = clampLatitudeBand(placed[index].yPercent, geographic[index].yPercent, yBand[index]);
      placed[index].yPercent = central[index] ? clampCentralY(yPercent) : yPercent;
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
