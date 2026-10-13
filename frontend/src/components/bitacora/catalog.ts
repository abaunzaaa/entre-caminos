export type StickerCategory = "viajes" | "naturaleza" | "recuerdos" | "papeles" | "ilustraciones";
export type StickerGroup = "stickers" | "elementos";

export type StickerItem = {
  id: string;
  name: string;
  category: StickerCategory;
  group: StickerGroup;
  src: string;
};

type Row = [string, string, StickerCategory, StickerGroup];

const SCRAP: Row[] = [
  ["viaje-01", "Pasaporte", "viajes", "stickers"],
  ["viaje-02", "Avión", "viajes", "stickers"],
  ["viaje-03", "Polaroids", "recuerdos", "stickers"],
  ["viaje-04", "Cámara", "viajes", "stickers"],
  ["viaje-05", "Mochila", "viajes", "stickers"],
  ["viaje-06", "Mapa", "viajes", "stickers"],
  ["viaje-07", "Brújula", "viajes", "stickers"],
  ["viaje-08", "Tiquete", "viajes", "stickers"],
  ["viaje-09", "Montañas", "naturaleza", "stickers"],
  ["viaje-10", "Flores rosadas", "naturaleza", "stickers"],
  ["viaje-11", "Pin de mapa", "viajes", "stickers"],
  ["viaje-12", "Estampilla de mariposa", "recuerdos", "stickers"],
  ["viaje-13", "Ramo silvestre", "naturaleza", "stickers"],
  ["viaje-14", "Rama", "naturaleza", "stickers"],
  ["viaje-15", "Café", "recuerdos", "stickers"],
  ["viaje-16", "Postal del mar", "recuerdos", "stickers"],
  ["viaje-17", "Sobre", "recuerdos", "stickers"],
  ["viaje-18", "Maleta", "viajes", "stickers"],
  ["viaje-20", "Carta", "recuerdos", "stickers"],
  ["viaje-21", "Globo", "viajes", "stickers"],
  ["papel-01", "Cinta floral rosa", "papeles", "elementos"],
  ["papel-02", "Cinta vichy", "papeles", "elementos"],
  ["papel-03", "Cinta de corazones", "papeles", "elementos"],
  ["papel-04", "Papel rasgado", "papeles", "elementos"],
  ["papel-05", "Cinta escocesa", "papeles", "elementos"],
  ["papel-06", "Cinta de flores", "papeles", "elementos"],
  ["papel-07", "Cinta de estrellas", "papeles", "elementos"],
  ["papel-08", "Papel manuscrito", "papeles", "elementos"],
  ["papel-09", "Nota de amor", "papeles", "elementos"],
  ["papel-10", "Definición", "papeles", "elementos"],
  ["papel-11", "Nota de suerte", "papeles", "elementos"],
  ["papel-12", "Tira de papel", "papeles", "elementos"],
  ["papel-13", "Estampilla de hoja", "papeles", "elementos"],
  ["papel-14", "Estampilla de mariposa", "papeles", "elementos"],
  ["papel-15", "Estampilla de corazón", "papeles", "elementos"],
  ["papel-16", "Ticket de cine", "papeles", "elementos"],
  ["papel-17", "Ticket de suerte", "papeles", "elementos"],
  ["papel-18", "Ticket de recuerdos", "papeles", "elementos"],
  ["papel-19", "Etiqueta de viaje", "papeles", "elementos"],
  ["papel-20", "Tarjeta de pasaporte", "papeles", "elementos"],
  ["papel-21", "Sello de viaje", "papeles", "elementos"],
  ["papel-22", "Tarjeta de aventura", "papeles", "elementos"],
  ["papel-23", "Ticket rosa", "papeles", "elementos"],
  ["papel-24", "Etiqueta azul", "papeles", "elementos"],
  ["papel-25", "Sobre aéreo", "papeles", "elementos"],
  ["papel-26", "Marco rojo", "papeles", "elementos"],
  ["papel-27", "Nota rayada", "papeles", "elementos"],
  ["papel-28", "Etiqueta beige", "papeles", "elementos"],
  ["papel-29", "Etiqueta verde", "papeles", "elementos"],
  ["papel-30", "Marca de kraft", "papeles", "elementos"],
  ["papel-31", "Etiqueta rosa", "papeles", "elementos"],
  ["papel-32", "Marco circular", "papeles", "elementos"],
  ["papel-33", "Marco ovalado", "papeles", "elementos"],
  ["papel-34", "Etiqueta con lazo", "papeles", "elementos"],
  ["papel-35", "Ficha verde", "papeles", "elementos"],
  ["papel-36", "Ficha rosa", "papeles", "elementos"],
  ["papel-37", "Pestaña azul", "papeles", "elementos"],
  ["papel-38", "Banderín rojo", "papeles", "elementos"],
  ["papel-39", "Banderín azul", "papeles", "elementos"],
  ["papel-40", "Banderín de corazón", "papeles", "elementos"],
  ["papel-41", "Banderín vichy", "papeles", "elementos"],
  ["papel-42", "Banderín floral", "papeles", "elementos"],
  ["papel-43", "Banderín de estrella", "papeles", "elementos"],
  ["papel-44", "Banderín cielo", "papeles", "elementos"],
  ["papel-45", "Banderín", "papeles", "elementos"],
  ["papel-46", "Banderín amarillo", "papeles", "elementos"],
  ["papel-47", "Banderín cuadros", "papeles", "elementos"],
  ["papel-48", "Pestaña de carpeta", "papeles", "elementos"],
  ["papel-49", "Lacre", "papeles", "elementos"],
  ["papel-50", "Ticket de corazón", "papeles", "elementos"],
  ["papel-51", "Sello del mundo", "papeles", "elementos"],
  ["papel-52", "Ticket numerado", "papeles", "elementos"],
  ["papel-53", "Ticket de avión", "papeles", "elementos"],
  ["papel-54", "Ticket del mundo", "papeles", "elementos"],
  ["papel-55", "Ticket de amor", "papeles", "elementos"],
  ["papel-56", "Clip de corazón", "papeles", "elementos"],
  ["papel-57", "Flores pequeñas", "naturaleza", "elementos"],
  ["papel-58", "Trébol", "naturaleza", "elementos"],
  ["papel-59", "Moño", "papeles", "elementos"],
  ["papel-60", "Cinta de puntos", "papeles", "elementos"],
  ["papel-61", "Cinta floral azul", "papeles", "elementos"],
  ["papel-62", "Cinta cuadros", "papeles", "elementos"],
  ["papel-63", "Corazón", "recuerdos", "elementos"],
];

const LINE: Row[] = [
  ["line-avion", "Avión lineal", "viajes", "stickers"],
  ["line-pasaporte", "Pasaporte lineal", "viajes", "stickers"],
  ["line-maleta", "Maleta lineal", "viajes", "stickers"],
  ["line-camara", "Cámara lineal", "viajes", "stickers"],
  ["line-camara2", "Cámara de viaje", "viajes", "stickers"],
  ["line-globo", "Globo terráqueo", "viajes", "stickers"],
  ["line-brujula", "Brújula lineal", "viajes", "stickers"],
  ["line-mapa", "Mapa lineal", "viajes", "stickers"],
  ["line-mapa2", "Mapa abierto", "viajes", "stickers"],
  ["line-pin", "Pin de ubicación", "viajes", "stickers"],
  ["line-tiquete", "Tiquete lineal", "viajes", "stickers"],
  ["line-van", "Van", "viajes", "stickers"],
  ["line-bus", "Bus", "viajes", "stickers"],
  ["line-taxi", "Taxi", "viajes", "stickers"],
  ["line-tren", "Tren", "viajes", "stickers"],
  ["line-moto", "Moto", "viajes", "stickers"],
  ["line-bici", "Bicicleta", "naturaleza", "stickers"],
  ["line-hotel", "Hotel", "viajes", "stickers"],
  ["line-mochila", "Mochila lineal", "viajes", "stickers"],
  ["line-bolso", "Bolso", "viajes", "stickers"],
  ["line-portatil", "Portátil", "viajes", "stickers"],
  ["line-ventanilla", "Ventanilla", "viajes", "stickers"],
  ["line-montana", "Montaña lineal", "naturaleza", "stickers"],
  ["line-cumbre", "Cumbre", "naturaleza", "stickers"],
  ["line-pinos", "Pinos", "naturaleza", "stickers"],
  ["line-palmera", "Palmera", "naturaleza", "stickers"],
  ["line-palmeras", "Palmeras", "naturaleza", "stickers"],
  ["line-sol", "Sol", "naturaleza", "stickers"],
  ["line-ola", "Ola", "naturaleza", "stickers"],
  ["line-concha", "Concha", "naturaleza", "stickers"],
  ["line-sombrilla", "Sombrilla", "naturaleza", "stickers"],
  ["line-velero", "Velero", "naturaleza", "stickers"],
  ["line-carpa", "Carpa", "naturaleza", "stickers"],
  ["line-fogata", "Fogata", "naturaleza", "stickers"],
  ["line-bota", "Bota", "naturaleza", "stickers"],
  ["line-canoa", "Canoa", "naturaleza", "stickers"],
  ["line-faro", "Faro", "naturaleza", "stickers"],
  ["line-binoculares", "Binoculares", "naturaleza", "stickers"],
  ["line-snorkel", "Snorkel", "naturaleza", "stickers"],
  ["line-chanclas", "Chanclas", "naturaleza", "stickers"],
  ["line-silla", "Silla", "naturaleza", "stickers"],
  ["line-protector", "Protector solar", "naturaleza", "stickers"],
  ["line-coctel", "Cóctel", "recuerdos", "stickers"],
  ["line-cafe", "Café lineal", "recuerdos", "stickers"],
  ["line-taza", "Taza", "recuerdos", "stickers"],
  ["line-letrero", "Letrero", "recuerdos", "stickers"],
  ["line-senal", "Señal", "recuerdos", "stickers"],
  ["line-flechas", "Flechas", "recuerdos", "stickers"],
];

function srcFor(id: string) {
  if (id.startsWith("line-") || id.startsWith("pastel-")) {
    return `/mis-caminos/stickers/${id}.png`;
  }
  return `/bitacora/stickers/${id}.png`;
}

function toItem(row: Row): StickerItem {
  return { id: row[0], name: row[1], category: row[2], group: row[3], src: srcFor(row[0]) };
}

const PASTEL: StickerItem[] = Array.from({ length: 27 }, (_, index) => {
  const id = `pastel-${String(index + 1).padStart(2, "0")}`;
  return {
    id,
    name: `Ilustración ${index + 1}`,
    category: "ilustraciones" as const,
    group: "stickers" as const,
    src: srcFor(id),
  };
});

export const STICKERS: StickerItem[] = [...SCRAP.map(toItem), ...LINE.map(toItem), ...PASTEL];

const BY_ID = new Map(STICKERS.map((item) => [item.id, item]));

export function stickerById(id: string) {
  return BY_ID.get(id) ?? null;
}

export function filterStickers(items: StickerItem[], query: string, category: StickerCategory | "todas") {
  const text = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "todas" && item.category !== category) {
      return false;
    }
    if (!text) {
      return true;
    }
    return item.name.toLowerCase().includes(text);
  });
}
