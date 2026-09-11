import { CloudSun, Heart, MapPin, Music, Trees, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { getPreferenceLabel } from "../../data/onboarding";
import { mediaUrl } from "../../utils/media";
import { locationSummary, type OnboardingForm } from "../../utils/onboarding";
import { AvatarPreview } from "./AvatarPreview";

function SummaryBlock({
  icon,
  label,
  values,
}: {
  icon: ReactNode;
  label: string;
  values: string[];
}) {
  return (
    <div className="onboarding-summary-block">
      <h2>
        {icon}
        {label}
      </h2>
      <div className="onboarding-tags">
        {values.length ? (
          values.map((value) => (
            <span key={value} className="onboarding-tag">
              {getPreferenceLabel(value)}
            </span>
          ))
        ) : (
          <span className="onboarding-tag is-empty">Más adelante</span>
        )}
      </div>
    </div>
  );
}

export function SummaryStep({
  form,
  userName,
  onChangeImage,
}: {
  form: OnboardingForm;
  userName: string;
  onChangeImage: () => void;
}) {
  const photo = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");
  const place = locationSummary(form);
  const displayName = userName.trim();

  return (
    <div className="onboarding-summary">
      <div className="onboarding-summary__identity">
        <div className="onboarding-summary__photo">
          {form.profileImageType === "PHOTO" && photo ? (
            <img src={photo} alt={displayName ? `Foto de ${displayName}` : "Foto de perfil"} />
          ) : (
            <AvatarPreview config={form.avatarConfig} size={200} label={displayName ? `Avatar de ${displayName}` : "Avatar de perfil"} />
          )}
        </div>
        <p className="onboarding-summary-card__status">Perfil listo</p>
        <h2>{displayName || "Tu perfil"}</h2>
        {place ? (
          <p className="onboarding-summary__place">
            <MapPin size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>{place}</span>
          </p>
        ) : null}
        <button type="button" className="onboarding-text-btn" onClick={onChangeImage}>
          Cambiar imagen
        </button>
      </div>
      <div className="onboarding-summary__details">
        <div className="onboarding-summary-grid">
          <SummaryBlock icon={<Trees size={14} strokeWidth={1.8} />} label="Intereses" values={form.interests} />
          <SummaryBlock icon={<Users size={14} strokeWidth={1.8} />} label="Compañía" values={form.companions} />
          <SummaryBlock icon={<Heart size={14} strokeWidth={1.8} />} label="Ambientes" values={form.places} />
          <SummaryBlock icon={<Music size={14} strokeWidth={1.8} />} label="Música" values={form.music} />
          <SummaryBlock icon={<Wallet size={14} strokeWidth={1.8} />} label="Presupuesto" values={form.budget} />
          <SummaryBlock icon={<CloudSun size={14} strokeWidth={1.8} />} label="Clima" values={form.climate} />
        </div>
        <p className="onboarding-summary__saved">
          Tus datos ya están guardados. Después podrás editar tus intereses y preferencias.
        </p>
      </div>
    </div>
  );
}
