import {
  BookOpen,
  Camera,
  Coffee,
  Dumbbell,
  Flower2,
  GraduationCap,
  Home,
  Landmark,
  Laptop,
  Luggage,
  Mountain,
  Music,
  Palette,
  PartyPopper,
  ShoppingBag,
  Tags,
  Trees,
  Utensils,
  type LucideIcon,
} from "lucide-react";

export const DEFAULT_CATEGORY_ICON = "tags";

export type CategoryIconOption = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { id: "nature", label: "Naturaleza", Icon: Trees },
  { id: "culture", label: "Cultura", Icon: Landmark },
  { id: "art", label: "Arte", Icon: Palette },
  { id: "music", label: "Música", Icon: Music },
  { id: "sport", label: "Deporte", Icon: Dumbbell },
  { id: "adventure", label: "Aventura", Icon: Mountain },
  { id: "food", label: "Gastronomía", Icon: Utensils },
  { id: "coffee", label: "Café", Icon: Coffee },
  { id: "photo", label: "Fotografía", Icon: Camera },
  { id: "history", label: "Historia", Icon: BookOpen },
  { id: "family", label: "Familia", Icon: Home },
  { id: "wellness", label: "Bienestar", Icon: Flower2 },
  { id: "education", label: "Educación", Icon: GraduationCap },
  { id: "tech", label: "Tecnología", Icon: Laptop },
  { id: "travel", label: "Viajes", Icon: Luggage },
  { id: "shopping", label: "Compras", Icon: ShoppingBag },
  { id: "events", label: "Eventos", Icon: PartyPopper },
];

const ICON_BY_ID: Record<string, LucideIcon> = {
  [DEFAULT_CATEGORY_ICON]: Tags,
  ...Object.fromEntries(CATEGORY_ICON_OPTIONS.map((option) => [option.id, option.Icon])),
};

export function getCategoryIcon(icon?: string | null): LucideIcon {
  return ICON_BY_ID[icon ?? ""] ?? Tags;
}

export function getCategoryIconOption(icon?: string | null): CategoryIconOption | undefined {
  return CATEGORY_ICON_OPTIONS.find((option) => option.id === icon);
}
