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
          <span className="onboarding-tag is-empty">Sin seleccionar</span>
        )}
      </div>
    </div>
  );
}

export function SummaryStep({ form, userName }: { form: OnboardingForm; userName: string }) {
  const photo = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");
  const place = locationSummary(form);
  const displayName = userName.trim();

  return (
    <article className="onboarding-summary-card">
      <header className="onboarding-summary-card__head">
        <div className="onboarding-summary-card__photo">
          {form.profileImageType === "PHOTO" && photo ? (
            <img src={photo} alt={displayName ? `Foto de ${displayName}` : "Foto de perfil"} />
          ) : (
            <AvatarPreview config={form.avatarConfig} size={150} label={displayName ? `Avatar de ${displayName}` : "Avatar de perfil"} />
          )}
        </div>
        <div>
          <p className="onboarding-summary-card__status">Perfil listo</p>
          <h2>{displayName || "Tu perfil"}</h2>
          {place ? (
            <p>
              <MapPin size={14} strokeWidth={1.8} aria-hidden="true" />
              {place}
            </p>
          ) : null}
        </div>
      </header>
      <div className="onboarding-summary-grid">
        <SummaryBlock
          icon={<MapPin size={14} strokeWidth={1.8} />}
          label="Ubicación"
          values={[form.country, form.department, form.city, form.neighborhood].filter(Boolean)}
        />
        <SummaryBlock icon={<Trees size={14} strokeWidth={1.8} />} label="Intereses" values={form.interests} />
        <SummaryBlock icon={<Users size={14} strokeWidth={1.8} />} label="Compañía" values={form.companions} />
        <SummaryBlock icon={<Heart size={14} strokeWidth={1.8} />} label="Ambientes" values={form.places} />
        <SummaryBlock icon={<Music size={14} strokeWidth={1.8} />} label="Música" values={form.music} />
        <SummaryBlock icon={<Wallet size={14} strokeWidth={1.8} />} label="Presupuesto" values={form.budget} />
        <SummaryBlock icon={<CloudSun size={14} strokeWidth={1.8} />} label="Clima" values={form.climate} />
      </div>
    </article>
  );
}
