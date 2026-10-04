import { useState } from "react";
import type { PublicOrganizationProfile } from "../../types";
import { mediaUrl } from "../../utils/media";

export function ExperienceOrganizationCard({ organization }: { organization: PublicOrganizationProfile }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const tradeName = organization.tradeName?.trim() || "";
  const logo = organization.logoUrl?.trim() && !logoFailed ? mediaUrl(organization.logoUrl, 96) : "";
  const initial = tradeName.charAt(0).toUpperCase() || "E";
  const place = [organization.city, organization.department]
    .map((item) => item?.trim() || "")
    .filter(Boolean)
    .join(", ");

  if (!tradeName) {
    return null;
  }

  return (
    <div className="dash-exps-dossier__org">
      <p className="dash-exps-dossier__note-label">Creada por</p>
      <div className="dash-exps-dossier__org-identity">
        <span className="dash-exps-dossier__org-logo" aria-hidden="true">
          {logo ? (
            <img src={logo} alt="" onError={() => setLogoFailed(true)} />
          ) : (
            <span>{initial}</span>
          )}
        </span>
        <span className="dash-exps-dossier__org-copy">
          <strong>{tradeName}</strong>
          {place ? <span>{place}</span> : null}
        </span>
      </div>
    </div>
  );
}
