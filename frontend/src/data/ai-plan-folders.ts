export const AI_PLAN_FOLDERS = [
  { key: "naturaleza", name: "Naturaleza y aventura", tone: "cream" },
  { key: "cultura", name: "Cultura y creatividad", tone: "rose" },
  { key: "sabores", name: "Sabores y bienestar", tone: "blue" },
  { key: "descubrimientos", name: "Planes y descubrimientos", tone: "sand" },
] as const;

export type AiPlanFolderKey = (typeof AI_PLAN_FOLDERS)[number]["key"];

export function aiPlanFolder(key: string) {
  return AI_PLAN_FOLDERS.find((folder) => folder.key === key) ?? AI_PLAN_FOLDERS[3];
}
