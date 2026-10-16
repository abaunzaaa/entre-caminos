import type { FontId } from "./types";

export const FONT_CLASS: Record<FontId, string> = {
  inter: "bita-font-inter",
  poppins: "bita-font-poppins",
  montserrat: "bita-font-montserrat",
  lato: "bita-font-lato",
  playfair: "bita-font-playfair",
  cormorant: "bita-font-cormorant",
  baskerville: "bita-font-baskerville",
  dmserif: "bita-font-dmserif",
  caveat: "bita-font-caveat",
  dancing: "bita-font-dancing",
  patrick: "bita-font-patrick",
  sacramento: "bita-font-sacramento",
  vibes: "bita-font-vibes",
  allura: "bita-font-allura",
  quicksand: "bita-font-quicksand",
  nunito: "bita-font-nunito",
  raleway: "bita-font-raleway",
  special: "bita-font-special",
};

const EXTRA_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Dancing+Script:wght@500;600&family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,500;0,600;0,700;1,500&family=Patrick+Hand&family=Quicksand:wght@500;600;700&family=Raleway:ital,wght@0,500;0,600;1,500&family=Sacramento&display=swap";

export function ensureBitacoraFonts() {
  if (typeof document === "undefined" || document.querySelector("link[data-bita-fonts]")) {
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = EXTRA_FONTS;
  link.dataset.bitaFonts = "true";
  document.head.appendChild(link);
}
