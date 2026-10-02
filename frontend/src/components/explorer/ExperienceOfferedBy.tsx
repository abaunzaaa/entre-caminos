import { Building2, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { PublicOrganizationProfile } from "../../types";
import { mediaUrl } from "../../utils/media";
import "../../styles/experience-offered-by.css";

type ExperienceOfferedByProps = {
  organization?: PublicOrganizationProfile | null;
  fallbackName?: string | null;
  fallbackAvatarUrl?: string | null;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "EC";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function ExperienceOfferedBy({
  organization,
  fallbackName,
  fallbackAvatarUrl,
}: ExperienceOfferedByProps) {
  const tradeName = organization?.tradeName?.trim() || fallbackName?.trim() || "";
  if (!tradeName) {
    return null;
  }

  const logoUrl = organization?.logoUrl || fallbackAvatarUrl || null;
  const place =
    organization?.city && organization?.department
      ? `${organization.city}, ${organization.department}`
      : organization?.city || organization?.department || "";
  const contacts = [
    organization?.contactPhone
      ? { key: "phone", href: `tel:${organization.contactPhone.replace(/\s+/g, "")}`, label: organization.contactPhone, Icon: Phone }
      : null,
    organization?.contactEmail
      ? { key: "email", href: `mailto:${organization.contactEmail}`, label: organization.contactEmail, Icon: Mail }
      : null,
    organization?.website
      ? {
          key: "web",
          href: organization.website,
          label: organization.website.replace(/^https?:\/\//i, ""),
          Icon: Globe,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    href: string;
    label: string;
    Icon: typeof Phone;
  }>;

  return (
    <section className="exp-offered-by" aria-label="Ofrecida por">
      <p className="exp-offered-by__eyebrow">Ofrecida por</p>
      <div className="exp-offered-by__card">
        <div className="exp-offered-by__identity">
          {logoUrl ? (
            <img
              className="exp-offered-by__logo"
              src={mediaUrl(logoUrl, 160)}
              alt={`Logo de ${tradeName}`}
            />
          ) : (
            <span className="exp-offered-by__fallback" aria-hidden="true">
              <Building2 size={22} strokeWidth={1.6} />
              <span>{initialsFromName(tradeName)}</span>
            </span>
          )}
          <div className="exp-offered-by__copy">
            <h3 className="exp-offered-by__name">{tradeName}</h3>
            {place ? (
              <p className="exp-offered-by__place">
                <MapPin size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>{place}</span>
              </p>
            ) : null}
          </div>
        </div>
        {organization?.description ? (
          <p className="exp-offered-by__description">{organization.description}</p>
        ) : null}
        {contacts.length ? (
          <ul className="exp-offered-by__contacts">
            {contacts.map(({ key, href, label, Icon }) => (
              <li key={key}>
                <a href={href} target={key === "web" ? "_blank" : undefined} rel={key === "web" ? "noreferrer" : undefined}>
                  <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
                  <span>{label}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
