import { useEffect, useState } from "react";
import { getOwnOrganizationProfile } from "../services/organization-profile.service";
import { mediaUrl } from "../utils/media";

export function useOrganizationLogo(enabled: boolean) {
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLogo(null);
      return;
    }
    let cancelled = false;
    getOwnOrganizationProfile()
      .then((profile) => {
        if (cancelled) {
          return;
        }
        const url = profile?.logoUrl?.trim() ?? "";
        setLogo(url ? mediaUrl(url, 256) : null);
      })
      .catch(() => {
        if (!cancelled) {
          setLogo(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return logo;
}
