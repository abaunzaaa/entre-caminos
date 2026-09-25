import { Camera, ChevronRight, MapPin, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { getPreferenceLabel } from "../../data/onboarding";
import { mediaUrl } from "../../utils/media";
import { locationSummary, type OnboardingForm } from "../../utils/onboarding";
import { AvatarPreview } from "./AvatarPreview";
import { BouquetIcon, CheersIcon, LandscapeIcon, RecordPlayerIcon, SunFaceIcon, WalletIcon } from "./SummaryLineIcons";

type PrefTab = "ambientes" | "musica" | "presupuesto" | "clima";
type SummarySection = "interests" | "company" | PrefTab;

function labels(values: string[]) {
  return values.map((value) => getPreferenceLabel(value)).filter(Boolean);
}

function SummaryCard({
  icon,
  title,
  values,
  onEdit,
}: {
  icon: ReactNode;
  title: string;
  values: string[];
  onEdit: () => void;
}) {
  const text = labels(values);
  return (
    <button type="button" className="onboarding-ready-card" onClick={onEdit}>
      <span className="onboarding-ready-card__icon">{icon}</span>
      <span className="onboarding-ready-card__copy">
        <span className="onboarding-ready-card__title">{title}</span>
        <span className={`onboarding-ready-card__values${text.length ? "" : " is-empty"}`}>
          {text.length ? text.join(" · ") : "Aún no eliges"}
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={1.8} className="onboarding-ready-card__chevron" aria-hidden="true" />
    </button>
  );
}

export function SummaryStep({
  form,
  userName,
  onChangeImage,
  onEdit,
}: {
  form: OnboardingForm;
  userName: string;
  onChangeImage: () => void;
  onEdit: (section: SummarySection) => void;
}) {
  const photo = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");
  const place = locationSummary(form);
  const displayName = userName.trim() || "Tu perfil";

  return (
    <div className="onboarding-summary onboarding-ready">
      <article className="onboarding-ready-profile">
        <button type="button" className="onboarding-ready-profile__photo" onClick={onChangeImage} aria-label="Cambiar imagen">
          {form.profileImageType === "PHOTO" && photo ? (
            <img src={photo} alt={displayName} />
          ) : (
            <AvatarPreview config={form.avatarConfig} size={112} label={`Avatar de ${displayName}`} />
          )}
          <span className="onboarding-ready-profile__edit" aria-hidden="true">
            <Pencil size={12} strokeWidth={2} />
          </span>
        </button>
        <p className="onboarding-ready-profile__badge">Perfil listo</p>
        <h2>{displayName}</h2>
        {place ? (
          <p className="onboarding-ready-profile__place">
            <MapPin size={12} strokeWidth={2} aria-hidden="true" />
            {place}
          </p>
        ) : null}
        <button type="button" className="onboarding-ready-profile__change" onClick={onChangeImage}>
          <Camera size={14} strokeWidth={1.8} aria-hidden="true" />
          Cambiar imagen
        </button>
      </article>

      <div className="onboarding-ready-grid">
        <SummaryCard icon={<BouquetIcon />} title="Intereses" values={form.interests} onEdit={() => onEdit("interests")} />
        <SummaryCard icon={<CheersIcon />} title="Compañía" values={form.companions} onEdit={() => onEdit("company")} />
        <SummaryCard icon={<LandscapeIcon />} title="Ambientes" values={form.places} onEdit={() => onEdit("ambientes")} />
        <SummaryCard icon={<RecordPlayerIcon />} title="Música" values={form.music} onEdit={() => onEdit("musica")} />
        <SummaryCard icon={<WalletIcon />} title="Presupuesto" values={form.budget} onEdit={() => onEdit("presupuesto")} />
        <SummaryCard icon={<SunFaceIcon />} title="Clima" values={form.climate} onEdit={() => onEdit("clima")} />
      </div>
    </div>
  );
}
