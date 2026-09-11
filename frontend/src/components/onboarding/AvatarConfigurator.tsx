import { Shuffle } from "lucide-react";
import {
  AVATAR_ACCESSORIES,
  AVATAR_FACES,
  AVATAR_GLASSES,
  AVATAR_HAIR_COLORS,
  AVATAR_HAIR_STYLES,
  AVATAR_OUTFIT_COLORS,
  AVATAR_OUTFITS,
  AVATAR_SKIN_TONES,
  DEFAULT_AVATAR_CONFIG,
  randomAvatarConfig,
} from "../../data/onboarding";
import type { AvatarConfig } from "../../types";
import { AvatarPreview } from "./AvatarPreview";

type TabId = "face" | "hair" | "outfit" | "accessories";

const TABS: { id: TabId; label: string }[] = [
  { id: "face", label: "Rostro" },
  { id: "hair", label: "Cabello" },
  { id: "outfit", label: "Ropa" },
  { id: "accessories", label: "Accesorios" },
];

type AvatarConfiguratorProps = {
  config: AvatarConfig;
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  onChange: (config: AvatarConfig) => void;
};

function SwatchButton({
  label,
  selected,
  onClick,
  color,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      className={`onboarding-swatch${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
    >
      {color ? <span className="onboarding-swatch__color" style={{ background: color }} aria-hidden="true" /> : null}
      <span>{label}</span>
    </button>
  );
}

export function AvatarConfigurator({ config, tab, onTabChange, onChange }: AvatarConfiguratorProps) {
  function patch(partial: Partial<AvatarConfig>) {
    onChange({ ...config, ...partial, version: 1 });
  }

  return (
    <div className="onboarding-avatar-studio">
      <div className="onboarding-avatar-studio__preview">
        <AvatarPreview config={config} size={168} />
        <div className="onboarding-avatar-studio__tools">
          <button type="button" className="onboarding-text-btn" onClick={() => onChange(DEFAULT_AVATAR_CONFIG)}>
            Restablecer
          </button>
          <button type="button" className="onboarding-text-btn" onClick={() => onChange(randomAvatarConfig())}>
            <Shuffle size={14} strokeWidth={1.8} aria-hidden="true" />
            Aleatorio
          </button>
        </div>
      </div>
      <div className="onboarding-avatar-studio__panel">
        <div className="onboarding-segment" role="tablist" aria-label="Personalización del avatar">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`onboarding-segment__btn${tab === item.id ? " is-active" : ""}`}
              onClick={() => onTabChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {tab === "face" ? (
          <div className="onboarding-swatch-grid">
            <p>Tono de piel</p>
            <div>
              {AVATAR_SKIN_TONES.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  color={item.color}
                  selected={config.skinTone === item.id}
                  onClick={() => patch({ skinTone: item.id })}
                />
              ))}
            </div>
            <p>Tipo de rostro</p>
            <div>
              {AVATAR_FACES.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  selected={config.face === item.id}
                  onClick={() => patch({ face: item.id })}
                />
              ))}
            </div>
          </div>
        ) : null}
        {tab === "hair" ? (
          <div className="onboarding-swatch-grid">
            <p>Estilo</p>
            <div>
              {AVATAR_HAIR_STYLES.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  selected={config.hairStyle === item.id}
                  onClick={() => patch({ hairStyle: item.id })}
                />
              ))}
            </div>
            <p>Color</p>
            <div>
              {AVATAR_HAIR_COLORS.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  color={item.color}
                  selected={config.hairColor === item.id}
                  onClick={() => patch({ hairColor: item.id })}
                />
              ))}
            </div>
          </div>
        ) : null}
        {tab === "outfit" ? (
          <div className="onboarding-swatch-grid">
            <p>Prenda</p>
            <div>
              {AVATAR_OUTFITS.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  selected={config.outfit === item.id}
                  onClick={() => patch({ outfit: item.id })}
                />
              ))}
            </div>
            <p>Color</p>
            <div>
              {AVATAR_OUTFIT_COLORS.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  color={item.color}
                  selected={config.outfitColor === item.id}
                  onClick={() => patch({ outfitColor: item.id })}
                />
              ))}
            </div>
          </div>
        ) : null}
        {tab === "accessories" ? (
          <div className="onboarding-swatch-grid">
            <p>Accesorio</p>
            <div>
              {AVATAR_ACCESSORIES.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  selected={(config.accessory ?? "none") === item.id}
                  onClick={() => patch({ accessory: item.id })}
                />
              ))}
            </div>
            <p>Gafas</p>
            <div>
              {AVATAR_GLASSES.map((item) => (
                <SwatchButton
                  key={item.id}
                  label={item.label}
                  selected={(config.glasses ?? "none") === item.id}
                  onClick={() => patch({ glasses: item.id })}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
