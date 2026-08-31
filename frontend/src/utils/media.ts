const PLACEHOLDER =
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80";

export function mediaUrl(url?: string | null) {
  if (!url) {
    return PLACEHOLDER;
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    const api = import.meta.env.VITE_API_URL as string | undefined;
    if (api) {
      try {
        return `${new URL(api).origin}${url}`;
      } catch {
        return url;
      }
    }
  }
  return url;
}

export const LOCATION_PRESETS = [
  { label: "Valle de Cocora", location: "Salento, Quindío", latitude: "4.6373", longitude: "-75.5705" },
  { label: "La Candelaria", location: "Bogotá", latitude: "4.5964", longitude: "-74.0739" },
  { label: "Guatapé", location: "Guatapé, Antioquia", latitude: "6.2342", longitude: "-75.1574" },
  { label: "Cartagena amurallada", location: "Cartagena, Bolívar", latitude: "10.4236", longitude: "-75.5375" },
  { label: "Tayrona", location: "Parque Tayrona, Magdalena", latitude: "11.3100", longitude: "-74.0900" },
  { label: "Filandia", location: "Filandia, Quindío", latitude: "4.6740", longitude: "-75.6580" },
];

export const EXPERIENCE_SPARKS = [
  {
    title: "Atelier de café entre nubes",
    description:
      "Cosecha, tostión en vivo y cata sensorial en una finca de altura. Un ritual lento para entender el paisaje con todos los sentidos, guiado por una familia cafetera.",
  },
  {
    title: "Noche de planetario y rooftop",
    description:
      "Observación de constelaciones, mapping urbano y cena corta en azotea. Ciencia, ciudad y silencio, en un formato íntimo para no más de doce personas.",
  },
  {
    title: "Kayak al amanecer en laguna sagrada",
    description:
      "Palada técnica, niebla sobre el agua y lectura del territorio. Incluye equipo, guía certificado y un desayuno ligero al volver a orilla.",
  },
];
