import { emptyPhoto, makeText, uid, type PageDoc, type PaperId, type TemplateId } from "./types";

const PAPER: Record<TemplateId, PaperId> = {
  blank: "warm",
  hero: "cream",
  collage: "warm",
  polaroids: "beige",
  note: "sage",
  diary: "lined",
};

export function createPage(template: TemplateId): PageDoc {
  return {
    id: uid(),
    background: PAPER[template],
    experienceId: null,
    elements: elementsFor(template),
  };
}

export function templateSketch(template: TemplateId) {
  return {
    paper: PAPER[template],
    items: elementsFor(template).map((element) => ({
      type: element.type === "photo" ? ("photo" as const) : ("text" as const),
      x: element.x,
      y: element.y,
      w: element.w,
      h: element.h,
      rotation: element.rotation,
      frame: element.type === "photo" ? element.props.frame : undefined,
    })),
  };
}

function elementsFor(template: TemplateId): PageDoc["elements"] {
  if (template === "blank") {
    return [];
  }
  if (template === "hero") {
    return [emptyPhoto({ x: 0.12, y: 0.1, w: 0.76, h: 0.72, z: 1 }, "none")];
  }
  if (template === "collage") {
    return [
      emptyPhoto({ x: 0.08, y: 0.08, w: 0.84, h: 0.4, z: 1 }, "cream"),
      emptyPhoto({ x: 0.08, y: 0.52, w: 0.84, h: 0.4, z: 2 }, "cream"),
    ];
  }
  if (template === "polaroids") {
    return [
      emptyPhoto({ x: 0.08, y: 0.06, w: 0.42, h: 0.4, rotation: -7, z: 1 }, "polaroid"),
      emptyPhoto({ x: 0.48, y: 0.1, w: 0.42, h: 0.4, rotation: 5, z: 2 }, "polaroid"),
      emptyPhoto({ x: 0.26, y: 0.5, w: 0.46, h: 0.42, rotation: -2, z: 3 }, "polaroid"),
    ];
  }
  if (template === "note") {
    return [
      emptyPhoto({ x: 0.1, y: 0.08, w: 0.78, h: 0.46, z: 1 }, "polaroid"),
      makeText(
        { x: 0.12, y: 0.62, w: 0.76, h: 0.28, z: 2, rotation: -1 },
        { text: "Este día quiero recordarlo así.", font: "caveat", size: 0.055, color: "#6d5344" },
      ),
    ];
  }
  return [
    makeText(
      { x: 0.1, y: 0.06, w: 0.8, h: 0.12, z: 1 },
      { text: "Un día en el camino", font: "playfair", size: 0.07, weight: 600, align: "center" },
    ),
    makeText(
      { x: 0.1, y: 0.18, w: 0.8, h: 0.08, z: 2 },
      { text: "Lugar y fecha", font: "special", size: 0.032, color: "#8a7048", align: "center" },
    ),
    emptyPhoto({ x: 0.14, y: 0.3, w: 0.72, h: 0.36, z: 3 }, "wide"),
    makeText(
      { x: 0.1, y: 0.7, w: 0.8, h: 0.22, z: 4 },
      { text: "Escribe aquí lo que quieres conservar.", font: "cormorant", size: 0.04, italic: true },
    ),
  ];
}
