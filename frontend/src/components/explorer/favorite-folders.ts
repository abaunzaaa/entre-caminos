import ceramicaImg from "../../assets/ceramica-expd.jpg";
import cocinaImg from "../../assets/flores-expd.jpg";
import tourImg from "../../assets/castillo-expd.jpg";
import pilatesImg from "../../assets/pilates-expd.jpg";

export type FavoriteFolderTone = "cream" | "rose" | "blue" | "sand";

export type FavoriteFolder = {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  tone: FavoriteFolderTone;
  /** Optional count for future favorites wiring */
  count?: number;
};

/** Temporary mock folders for the visual favorites UI. Replace with real data later. */
export const MOCK_FAVORITE_FOLDERS: FavoriteFolder[] = [
  {
    id: "cultural",
    category: "Cultural",
    title: "Taller de cerámica",
    subtitle: "El Carmen de Viboral",
    imageSrc: ceramicaImg,
    tone: "cream",
    count: 3,
  },
  {
    id: "recreativo",
    category: "Recreativo",
    title: "Clase de cocina",
    subtitle: "Medellín",
    imageSrc: cocinaImg,
    tone: "rose",
    count: 2,
  },
  {
    id: "turistico",
    category: "Turístico",
    title: "Tour por la Comuna 13",
    subtitle: "Medellín",
    imageSrc: tourImg,
    tone: "blue",
    count: 4,
  },
  {
    id: "deportivo",
    category: "Deportivo",
    title: "Clase de Pilates",
    subtitle: "Medellín",
    imageSrc: pilatesImg,
    tone: "sand",
    count: 1,
  },
];
