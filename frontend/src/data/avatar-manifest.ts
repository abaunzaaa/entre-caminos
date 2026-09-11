import {
  AVATAR_ACCESSORIES,
  AVATAR_EYEBROWS,
  AVATAR_EYES,
  AVATAR_FACES,
  AVATAR_GLASSES,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_MOUTHS,
  AVATAR_OUTFIT_COLORS,
  AVATAR_OUTFITS,
  AVATAR_SKIN_TONES,
} from "./onboarding";
import type { AvatarConfig } from "../types";

export type AvatarOption = {
  id: string;
  label: string;
  file: string;
};

export type ColorOption = {
  id: string;
  label: string;
  color: string;
};

export type AvatarAssetManifest = {
  version: number;
  basePath: string;
  ready: boolean;
  skinTones: ColorOption[];
  faceShapes: AvatarOption[];
  eyes: AvatarOption[];
  eyebrows: AvatarOption[];
  mouths: AvatarOption[];
  hairstyles: AvatarOption[];
  hairColors: ColorOption[];
  outfits: AvatarOption[];
  outfitColors: ColorOption[];
  glasses: AvatarOption[];
  accessories: AvatarOption[];
};

const basePath = "/src/assets/avatars/v2";

function option(id: string, label: string, folder: string): AvatarOption {
  return { id, label, file: `${basePath}/${folder}/${id}.png` };
}

export const AVATAR_ASSET_MANIFEST: AvatarAssetManifest = {
  version: 2,
  basePath,
  ready: false,
  skinTones: [...AVATAR_SKIN_TONES],
  faceShapes: AVATAR_FACES.map((item) => option(item.id, item.label, "face")),
  eyes: AVATAR_EYES.map((item) => option(item.id, item.label, "eyes")),
  eyebrows: AVATAR_EYEBROWS.map((item) => option(item.id, item.label, "eyebrows")),
  mouths: AVATAR_MOUTHS.map((item) => option(item.id, item.label, "mouths")),
  hairstyles: AVATAR_HAIR_STYLES.map((item) => option(item.id, item.label, "hair")),
  hairColors: [...AVATAR_HAIR_COLORS],
  outfits: AVATAR_OUTFITS.map((item) => option(item.id, item.label, "outfit")),
  outfitColors: [...AVATAR_OUTFIT_COLORS],
  glasses: AVATAR_GLASSES.map((item) => option(item.id, item.label, "glasses")),
  accessories: AVATAR_ACCESSORIES.map((item) => option(item.id, item.label, "accessory")),
};

export function avatarLayerSources(config: AvatarConfig) {
  const hairFile =
    config.hairStyle === "none"
      ? null
      : `${basePath}/hair/${config.hairStyle}/${config.hairColor}.png`;
  return [
    { id: "skin", src: `${basePath}/skin/${config.skinTone}.png` },
    { id: "face", src: `${basePath}/face/${config.face}.png` },
    { id: "eyes", src: `${basePath}/eyes/${config.eyes ?? "almond"}.png` },
    { id: "eyebrows", src: `${basePath}/eyebrows/${config.eyebrows ?? "soft"}.png` },
    { id: "mouth", src: `${basePath}/mouths/${config.mouth ?? "soft-smile"}.png` },
    hairFile ? { id: "hair", src: hairFile } : null,
    { id: "outfit", src: `${basePath}/outfit/${config.outfit}/${config.outfitColor}.png` },
    config.glasses && config.glasses !== "none"
      ? { id: "glasses", src: `${basePath}/glasses/${config.glasses}.png` }
      : null,
    config.accessory && config.accessory !== "none"
      ? { id: "accessory", src: `${basePath}/accessory/${config.accessory}.png` }
      : null,
  ].filter(Boolean) as { id: string; src: string }[];
}

export const MISSING_AVATAR_ASSETS = [
  "skin/{sand,honey,amber,cocoa,espresso}.png",
  "face/{soft,oval,round}.png",
  "eyes/{almond,round,lidded}.png",
  "eyebrows/{soft,defined,arched}.png",
  "mouths/{neutral,soft-smile,calm}.png",
  "hair/{short,wavy,bun,fade}/{ink,chestnut,gold,silver,dark}.png",
  "outfit/{shirt,knit,jacket}/{forest,sage,sand,clay}.png",
  "glasses/{round,thin}.png",
  "accessory/earring.png",
];
