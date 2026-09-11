import {
  AVATAR_HAIR_COLORS,
  AVATAR_OUTFIT_COLORS,
  AVATAR_SKIN_TONES,
} from "../../data/onboarding";
import type { AvatarConfig } from "../../types";

function colorOf(list: readonly { id: string; color: string }[], id: string, fallback: string) {
  return list.find((item) => item.id === id)?.color ?? fallback;
}

function headShape(face: string) {
  if (face === "round") {
    return { cx: 80, cy: 78, rx: 34, ry: 36 };
  }
  if (face === "oval") {
    return { cx: 80, cy: 76, rx: 28, ry: 38 };
  }
  return { cx: 80, cy: 77, rx: 31, ry: 36 };
}

export function AvatarPreview({
  config,
  size = 168,
  label,
}: {
  config: AvatarConfig;
  size?: number;
  label?: string;
}) {
  const skin = colorOf(AVATAR_SKIN_TONES, config.skinTone, "#d4a574");
  const hair = colorOf(AVATAR_HAIR_COLORS, config.hairColor, "#6b3f2a");
  const outfit = colorOf(AVATAR_OUTFIT_COLORS, config.outfitColor, "#294942");
  const head = headShape(config.face);
  const outfitPath =
    config.outfit === "jacket"
      ? "M28 148c8-28 24-38 52-38s44 10 52 38v18H28z"
      : config.outfit === "shirt"
        ? "M36 150c6-22 18-32 44-32s38 10 44 32v16H36z"
        : "M32 149c8-24 22-34 48-34s40 10 48 34v17H32z";

  return (
    <svg
      viewBox="0 0 160 176"
      width={size}
      height={size}
      role="img"
      aria-label={label ?? "Vista previa del avatar"}
      className="onboarding-avatar-svg"
    >
      <rect width="160" height="176" rx="28" fill="#f4f1ea" />
      <ellipse cx="80" cy="168" rx="48" ry="10" fill="#e4ddd2" />
      <path d={outfitPath} fill={outfit} />
      {config.outfit === "jacket" ? (
        <path d="M80 112v54M54 150l26-16 26 16" stroke="#fffdfa" strokeWidth="3" fill="none" />
      ) : config.outfit === "shirt" ? (
        <path d="M68 120h24v8H68z" fill="#fffdfa" opacity="0.7" />
      ) : (
        <path d="M54 132c8 8 18 12 26 12s18-4 26-12" stroke="#fffdfa" strokeWidth="2" fill="none" opacity="0.45" />
      )}
      <ellipse cx="80" cy="118" rx="11" ry="8" fill={skin} />
      <ellipse cx={head.cx} cy={head.cy} rx={head.rx} ry={head.ry} fill={skin} />
      {config.hairStyle !== "none" ? (
        <g fill={hair}>
          {config.hairStyle === "short" ? (
            <path d="M50 72c4-28 18-38 30-38s26 10 30 38c-8-10-18-14-30-14S58 62 50 72z" />
          ) : null}
          {config.hairStyle === "wavy" ? (
            <>
              <path d="M46 78c2-34 18-48 34-48s32 14 34 48c-8-16-20-22-34-22S54 62 46 78z" />
              <path d="M44 86c0 16 6 28 10 28 2-10 4-20 4-30-4 0-10 0-14 2z" />
              <path d="M116 86c0 16-6 28-10 28-2-10-4-20-4-30 4 0 10 0 14 2z" />
            </>
          ) : null}
          {config.hairStyle === "bun" ? (
            <>
              <path d="M52 74c4-24 16-34 28-34s24 10 28 34c-8-8-16-12-28-12S60 66 52 74z" />
              <circle cx="80" cy="30" r="12" />
            </>
          ) : null}
          {config.hairStyle === "fade" ? (
            <path d="M54 70c6-22 16-30 26-30s20 8 26 30c-10-8-16-10-26-10s-16 2-26 10z" />
          ) : null}
        </g>
      ) : null}
      <g fill="#24352f">
        <ellipse cx="68" cy="78" rx={config.face === "round" ? 3.4 : 3} ry="3.6" />
        <ellipse cx="92" cy="78" rx={config.face === "round" ? 3.4 : 3} ry="3.6" />
      </g>
      <path d="M78 88c2 3 4 3 6 0" stroke="#8d5a3b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path
        d={config.face === "oval" ? "M74 98c4 6 10 6 14 0" : "M73 97c5 8 12 8 16 0"}
        stroke="#a56b58"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />
      {config.glasses === "round" ? (
        <g fill="none" stroke="#24352f" strokeWidth="2">
          <circle cx="68" cy="78" r="9" />
          <circle cx="92" cy="78" r="9" />
          <path d="M77 78h6" />
        </g>
      ) : null}
      {config.glasses === "thin" ? (
        <g fill="none" stroke="#24352f" strokeWidth="1.6">
          <rect x="58" y="72" width="18" height="12" rx="3" />
          <rect x="84" y="72" width="18" height="12" rx="3" />
          <path d="M76 78h8" />
        </g>
      ) : null}
      {config.accessory === "earring" ? <circle cx="48" cy="96" r="3.2" fill="#c4a35a" /> : null}
    </svg>
  );
}
