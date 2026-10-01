import { Camera, ChevronRight, MapPin, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { getPreferenceLabel } from "../../data/onboarding";
import { mediaUrl } from "../../utils/media";
import { locationSummary, type OnboardingForm } from "../../utils/onboarding";
import { AvatarPreview } from "./AvatarPreview";
import { BouquetIcon, CheersIcon, LandscapeIcon, RecordPlayerIcon, SunFaceIcon, WalletIcon } from "./SummaryLineIcons";

type PrefTab = "ambientes" | "musica" | "presupuesto" | "clima";
export type SummarySection = "interests" | "company" | PrefTab;

function labels(values: string[]) {
  return values.map((value) => getPreferenceLabel(value)).filter(Boolean);
}

function SummaryCard({
  icon,
  title,
  values,
  emptyLabel,
  onEdit,
  readOnly,
}: {
  icon: ReactNode;
  title: string;
  values: string[];
  emptyLabel: string;
  onEdit?: () => void;
  readOnly?: boolean;
}) {
  const text = labels(values);
  const content = (
    <>
      <span className="onboarding-ready-card__icon">{icon}</span>
      <span className="onboarding-ready-card__copy">
        <span className="onboarding-ready-card__title">{title}</span>
        <span className={`onboarding-ready-card__values${text.length ? "" : " is-empty"}`}>
          {text.length ? text.join(" · ") : emptyLabel}
        </span>
      </span>
      {!readOnly ? (
        <ChevronRight size={16} strokeWidth={1.8} className="onboarding-ready-card__chevron" aria-hidden="true" />
      ) : null}
    </>
  );

  if (readOnly || !onEdit) {
    return <div className="onboarding-ready-card onboarding-ready-card--static">{content}</div>;
  }

  return (
    <button type="button" className="onboarding-ready-card" onClick={onEdit}>
      {content}
    </button>
  );
}

export function SummaryStep({
  form,
  userName,
  onChangeImage,
  onEdit,
  readOnly = false,
}: {
  form: OnboardingForm;
  userName: string;
  onChangeImage?: () => void;
  onEdit?: (section: SummarySection) => void;
  readOnly?: boolean;
}) {
  const photo = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");
  const place = locationSummary(form);
  const displayName = userName.trim() || "Tu perfil";
  const emptyLabel = readOnly ? "Sin especificar" : "Aún no eliges";

  const photoNode =
    form.profileImageType === "PHOTO" && photo ? (
      <img src={photo} alt={displayName} />
    ) : (
      <AvatarPreview config={form.avatarConfig} size={readOnly ? 96 : 112} label={`Avatar de ${displayName}`} />
    );

  return (
    <div className={`onboarding-summary onboarding-ready${readOnly ? " onboarding-ready--view" : ""}`}>
      <article className="onboarding-ready-profile">
        {readOnly || !onChangeImage ? (
          <div className="onboarding-ready-profile__photo onboarding-ready-profile__photo--static">{photoNode}</div>
        ) : (
          <button type="button" className="onboarding-ready-profile__photo" onClick={onChangeImage} aria-label="Cambiar imagen">
            {photoNode}
            <span className="onboarding-ready-profile__edit" aria-hidden="true">
              <Pencil size={12} strokeWidth={2} />
            </span>
          </button>
        )}
        <p className="onboarding-ready-profile__badge">{readOnly ? "Tu perfil" : "Perfil listo"}</p>
        <h2>{displayName}</h2>
        <p className={`onboarding-ready-profile__place${!place ? " is-empty" : ""}`}>
          <MapPin size={12} strokeWidth={2} aria-hidden="true" />
          {place || emptyLabel}
        </p>
        {!readOnly && onChangeImage ? (
          <button type="button" className="onboarding-ready-profile__change" onClick={onChangeImage}>
            <Camera size={14} strokeWidth={1.8} aria-hidden="true" />
            Cambiar imagen
          </button>
        ) : null}
      </article>

      <div className="onboarding-ready-grid">
        <SummaryCard
          icon={<BouquetIcon />}
          title="Intereses"
          values={form.interests}
          emptyLabel={emptyLabel}
          readOnly={readOnly}
          onEdit={onEdit ? () => onEdit("interests") : undefined}
        />
        <SummaryCard
          icon={<CheersIcon />}
          title="Compañía"
          values={form.companions}
          emptyLabel={emptyLabel}
          readOnly={readOnly}
          onEdit={onEdit ? () => onEdit("company") : undefined}
        />
        <SummaryCard
          icon={<LandscapeIcon />}
          title="Ambientes"
          values={form.places}
          emptyLabel={emptyLabel}
          readOnly={readOnly}
          onEdit={onEdit ? () => onEdit("ambientes") : undefined}
        />
        <SummaryCard
          icon={<RecordPlayerIcon />}
          title="Música"
          values={form.music}
          emptyLabel={emptyLabel}
          readOnly={readOnly}
          onEdit={onEdit ? () => onEdit("musica") : undefined}
        />
        <SummaryCard
          icon={<WalletIcon />}
          title="Presupuesto"
          values={form.budget}
          emptyLabel={emptyLabel}
          readOnly={readOnly}
          onEdit={onEdit ? () => onEdit("presupuesto") : undefined}
        />
        <SummaryCard
          icon={<SunFaceIcon />}
          title="Clima"
          values={form.climate}
          emptyLabel={emptyLabel}
          readOnly={readOnly}
          onEdit={onEdit ? () => onEdit("clima") : undefined}
        />
      </div>
    </div>
  );
}
