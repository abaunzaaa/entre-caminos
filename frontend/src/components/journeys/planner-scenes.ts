export type PlannerScene = {
  src: string;
  label: string;
};

const SCENES = {
  flores: { src: "/mis-caminos/fondos/marzo.jpg", label: "Flores suaves" },
  lluvia: { src: "/mis-caminos/fondos/abril.jpg", label: "Naturaleza delicada" },
  campo: { src: "/mis-caminos/fondos/junio.jpg", label: "Campo claro" },
  hojas: { src: "/mis-caminos/fondos/octubre.jpg", label: "Hojas suaves" },
  luz: { src: "/mis-caminos/fondos/diciembre.jpg", label: "Luz cálida" },
} as const satisfies Record<string, PlannerScene>;

const BY_MONTH: Record<number, keyof typeof SCENES> = {
  1: "lluvia",
  2: "flores",
  3: "flores",
  4: "lluvia",
  5: "flores",
  6: "campo",
  7: "campo",
  8: "campo",
  9: "hojas",
  10: "hojas",
  11: "hojas",
  12: "luz",
};

export function plannerScene(month: number): PlannerScene {
  return SCENES[BY_MONTH[month] ?? "campo"];
}
