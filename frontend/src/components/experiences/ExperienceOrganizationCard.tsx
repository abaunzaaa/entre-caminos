import { useState } from "react";
import { Compass, Globe, Phone } from "lucide-react";
import type { PublicOrganizationProfile } from "../../types";
import { mediaUrl } from "../../utils/media";

function publicHref(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function phoneHref(value: string) {
  const dial = value.replace(/[^\d+]/g, "");
  return dial ? `tel:${dial}` : "";
}

function publishedLabel(count: number) {
  return count === 1 ? "1 experiencia publicada" : `${count} experiencias publicadas`;
}

export function ExperienceOrganizationCard({ organization }: { organization: PublicOrganizationProfile }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const tradeName = organization.tradeName?.trim() || "";
  const description = organization.description?.trim() || "";
  const logo = organization.logoUrl?.trim() && !logoFailed ? mediaUrl(organization.logoUrl, 128) : "";
  const initial = tradeName.charAt(0).toUpperCase() || "E";
  const place = [organization.city, organization.department]
    .map((item) => item?.trim() || "")
    .filter(Boolean)
    .join(", ");
  const phone = organization.contactPhone?.trim() || "";
  const dial = phone ? phoneHref(phone) : "";
  const website = organization.website?.trim() || "";
  const websiteHref = website ? publicHref(website) : "";
  const websiteLabel = website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const count = organization.publishedCount;
  const hasMeta = Boolean(phone || websiteHref || typeof count === "number");

  if (!tradeName) {
    return null;
  }

  return (
    <article className="experience-org">
      <p className="experience-org__kicker">Creada por</p>
      <span className="experience-org__logo" aria-hidden="true">
        {logo ? (
          <img src={logo} alt="" onError={() => setLogoFailed(true)} />
        ) : (
          <span>{initial}</span>
        )}
      </span>
      <h3>{tradeName}</h3>
      {place ? <p className="experience-org__place">{place}</p> : null}
      {description ? <p className="experience-org__description">{description}</p> : null}
      {hasMeta ? (
        <ul className="experience-org__meta">
          {phone ? (
            <li>
              <Phone size={13} strokeWidth={1.7} aria-hidden="true" />
              {dial ? <a href={dial}>{phone}</a> : <span>{phone}</span>}
            </li>
          ) : null}
          {websiteHref ? (
            <li>
              <Globe size={13} strokeWidth={1.7} aria-hidden="true" />
              <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                {websiteLabel}
              </a>
            </li>
          ) : null}
          {typeof count === "number" ? (
            <li>
              <Compass size={13} strokeWidth={1.7} aria-hidden="true" />
              <span>{publishedLabel(count)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}
