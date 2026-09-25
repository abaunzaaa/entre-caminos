import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, RotateCcw, Scissors, Shirt, Smile, Sparkles, Shuffle, type LucideIcon } from "lucide-react";
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
  DEFAULT_AVATAR_CONFIG,
  randomAvatarConfig,
} from "../../data/onboarding";
import type { AvatarConfig } from "../../types";
import { AvatarPreview } from "./AvatarPreview";

type TabId = "face" | "hair" | "outfit" | "accessories";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "face", label: "Rostro", icon: Smile },
  { id: "hair", label: "Cabello", icon: Scissors },
  { id: "outfit", label: "Ropa", icon: Shirt },
  { id: "accessories", label: "Accesorios", icon: Sparkles },
];

type AvatarConfiguratorProps = {
  config: AvatarConfig;
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  onChange: (config: AvatarConfig) => void;
};

function ColorDot({
  label,
  color,
  selected,
  onClick,
}: {
  label: string;
  color: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`onboarding-color-dot${selected ? " is-selected" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={selected}
      onClick={onClick}
    >
      <span style={{ background: color }} />
      {selected ? <Check size={12} strokeWidth={2.8} aria-hidden="true" /> : null}
    </button>
  );
}

function Choice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`onboarding-choice-pill${selected ? " is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="onboarding-avatar-row">
      <p>{label}</p>
      <div className="onboarding-avatar-field__options">{children}</div>
    </div>
  );
}

export function AvatarConfigurator({ config, tab, onTabChange, onChange }: AvatarConfiguratorProps) {
  const [live, setLive] = useState(false);
  const liveTimer = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => window.clearTimeout(liveTimer.current);
  }, []);

  function bump() {
    window.clearTimeout(liveTimer.current);
    setLive(true);
    liveTimer.current = window.setTimeout(() => setLive(false), 420);
  }

  function patch(partial: Partial<AvatarConfig>) {
    onChange({ ...config, ...partial, version: 2 });
    bump();
  }

  return (
    <div className="onboarding-avatar-studio">
      <div className="onboarding-avatar-studio__preview">
        <div className={`onboarding-avatar-frame${live ? " is-live" : ""}`}>
          <AvatarPreview config={config} size={168} />
        </div>
        <p className="onboarding-avatar-note">Así te verán en las experiencias.</p>
        <div className="onboarding-avatar-studio__tools">
          <button
            type="button"
            className="onboarding-text-btn"
            onClick={() => {
              onChange(randomAvatarConfig());
              bump();
            }}
          >
            <Shuffle size={14} strokeWidth={1.8} aria-hidden="true" />
            Al azar
          </button>
          <button
            type="button"
            className="onboarding-text-btn"
            onClick={() => {
              onChange(DEFAULT_AVATAR_CONFIG);
              bump();
            }}
          >
            <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
            Inicio
          </button>
        </div>
      </div>
      <div className="onboarding-avatar-studio__panel">
        <div className="onboarding-segment onboarding-segment--four" role="tablist" aria-label="Personalización del avatar">
          {TABS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`onboarding-segment__btn${tab === item.id ? " is-active" : ""}`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>
        {tab === "face" ? (
          <div className="onboarding-avatar-rows">
            <Field label="Tono de piel">
              {AVATAR_SKIN_TONES.map((item) => (
                <ColorDot
                  key={item.id}
                  label={item.label}
                  color={item.color}
                  selected={config.skinTone === item.id}
                  onClick={() => patch({ skinTone: item.id })}
                />
              ))}
            </Field>
            <Field label="Forma del rostro">
              {AVATAR_FACES.map((item) => (
                <Choice key={item.id} label={item.label} selected={config.face === item.id} onClick={() => patch({ face: item.id })} />
              ))}
            </Field>
            <Field label="Ojos">
              {AVATAR_EYES.map((item) => (
                <Choice
                  key={item.id}
                  label={item.label}
                  selected={(config.eyes ?? "almond") === item.id}
                  onClick={() => patch({ eyes: item.id })}
                />
              ))}
            </Field>
            <Field label="Cejas">
              {AVATAR_EYEBROWS.map((item) => (
                <Choice
                  key={item.id}
                  label={item.label}
                  selected={(config.eyebrows ?? "soft") === item.id}
                  onClick={() => patch({ eyebrows: item.id })}
                />
              ))}
            </Field>
            <Field label="Boca">
              {AVATAR_MOUTHS.map((item) => (
                <Choice
                  key={item.id}
                  label={item.label}
                  selected={(config.mouth ?? "soft-smile") === item.id}
                  onClick={() => patch({ mouth: item.id })}
                />
              ))}
            </Field>
          </div>
        ) : null}
        {tab === "hair" ? (
          <div className="onboarding-avatar-rows">
            <Field label="Estilo de cabello">
              {AVATAR_HAIR_STYLES.map((item) => (
                <Choice key={item.id} label={item.label} selected={config.hairStyle === item.id} onClick={() => patch({ hairStyle: item.id })} />
              ))}
            </Field>
            <Field label="Color">
              {AVATAR_HAIR_COLORS.map((item) => (
                <ColorDot
                  key={item.id}
                  label={item.label}
                  color={item.color}
                  selected={config.hairColor === item.id}
                  onClick={() => patch({ hairColor: item.id })}
                />
              ))}
            </Field>
          </div>
        ) : null}
        {tab === "outfit" ? (
          <div className="onboarding-avatar-rows">
            <Field label="Prenda">
              {AVATAR_OUTFITS.map((item) => (
                <Choice key={item.id} label={item.label} selected={config.outfit === item.id} onClick={() => patch({ outfit: item.id })} />
              ))}
            </Field>
            <Field label="Color">
              {AVATAR_OUTFIT_COLORS.map((item) => (
                <ColorDot
                  key={item.id}
                  label={item.label}
                  color={item.color}
                  selected={config.outfitColor === item.id}
                  onClick={() => patch({ outfitColor: item.id })}
                />
              ))}
            </Field>
          </div>
        ) : null}
        {tab === "accessories" ? (
          <div className="onboarding-avatar-rows">
            <Field label="Gafas">
              {AVATAR_GLASSES.map((item) => (
                <Choice
                  key={item.id}
                  label={item.label}
                  selected={(config.glasses ?? "none") === item.id}
                  onClick={() => patch({ glasses: item.id })}
                />
              ))}
            </Field>
            <Field label="Accesorio">
              {AVATAR_ACCESSORIES.map((item) => (
                <Choice
                  key={item.id}
                  label={item.label}
                  selected={(config.accessory ?? "none") === item.id}
                  onClick={() => patch({ accessory: item.id })}
                />
              ))}
            </Field>
          </div>
        ) : null}
      </div>
    </div>
  );
}
