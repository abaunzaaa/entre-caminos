import { prisma } from "../database/prisma.js";

export type GuideCatalogItem = {
  id: string;
  title: string;
  description: string;
  location: string;
  price: unknown;
  duration: string | null;
  imageUrl: string | null;
  category: string | null;
};

export async function loadGuideContext(input: {
  userId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  experienceId?: string;
  location?: { latitude?: number; longitude?: number; city?: string };
}) {
  const [user, profile, focus, published] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: input.userId },
      select: {
        city: true,
        department: true,
        interests: true,
        companions: true,
        places: true,
        budget: true,
        climate: true,
        latitude: true,
        longitude: true,
      },
    }),
    input.experienceId
      ? prisma.experience.findFirst({
          where: { id: input.experienceId, status: "PUBLISHED" },
          include: { category: true },
        })
      : Promise.resolve(null),
    prisma.experience.findMany({
      where: { status: "PUBLISHED" },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const catalog: GuideCatalogItem[] = published.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description.slice(0, 280),
    location: item.location,
    price: item.price,
    duration: item.duration,
    imageUrl: item.imageUrl,
    category: item.category?.name ?? null,
  }));

  const history = input.history
    .slice(-12)
    .map((item) => `${item.role === "user" ? "Persona" : "Guía"}: ${item.content}`)
    .join("\n");

  const prompt = [
    user?.name ? `Nombre de la persona: ${user.name}.` : "",
    profile
      ? `Perfil: ciudad ${profile.city ?? "sin definir"}, intereses ${profile.interests.join(", ") || "sin definir"}, compañía ${profile.companions.join(", ") || "sin definir"}, presupuesto ${profile.budget.join(", ") || "sin definir"}, climas ${profile.climate.join(", ") || "sin definir"}.`
      : "Perfil: aún no hay preferencias guardadas.",
    input.location?.city ? `Ubicación actual declarada: ${input.location.city}.` : "",
    focus
      ? `Estás hablando de esta experiencia: ${focus.title}. Categoría: ${focus.category?.name ?? "N/A"}. Lugar: ${focus.location}. Precio: ${String(focus.price)}. Duración: ${focus.duration ?? "variable"}. Descripción: ${focus.description.slice(0, 500)}. Cómo llegar: ${focus.howToGetThere ?? "no indicado"}.`
      : "No hay una experiencia abierta. Eres el guía general.",
    "Catálogo (id | título | categoría | lugar | precio | duración):",
    catalog
      .map(
        (item) =>
          `- ${item.id} | ${item.title} | ${item.category ?? "Experiencia"} | ${item.location} | ${String(item.price)} | ${item.duration ?? "duración variable"}`,
      )
      .join("\n") || "(vacío)",
    history ? `Conversación:\n${history}` : "",
    `Mensaje nuevo: ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    catalog,
    cityFallback: profile?.city || "",
    prompt,
  };
}
