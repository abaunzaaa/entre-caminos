import { useEffect, useState } from "react";
import type { PublicUser } from "../../types";
import { nameInitial, resolveAvatarUrl } from "../../utils/admin-avatar";
import { snapshotAvatarConfig } from "../../utils/avatar-snapshot";

export function UserAvatar({
  user,
  src,
  className,
  initial,
  alt = "",
  size = 40,
}: {
  user?: PublicUser | null;
  src?: string | null;
  className: string;
  initial?: string;
  alt?: string;
  size?: number;
}) {
  const resolved = (src && src.trim()) || resolveAvatarUrl(user);
  const [illustrated, setIllustrated] = useState<string | null>(null);
  const letter = initial ?? nameInitial(user?.name);
  const config = user?.profile?.profileImageType === "AVATAR" ? user.profile.avatarConfig : null;
  const configKey = config ? JSON.stringify(config) : "";

  useEffect(() => {
    if (resolved || !config) {
      setIllustrated(null);
      return;
    }
    let cancelled = false;
    void snapshotAvatarConfig(config, Math.max(size * 2, 128))
      .then((url) => {
        if (!cancelled) {
          setIllustrated(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIllustrated(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [resolved, config, configKey, size]);

  const photo = resolved || illustrated;
  const waitingIllustrated = !photo && Boolean(config);
  return (
    <span className={className}>
      {photo ? <img src={photo} alt={alt} /> : waitingIllustrated ? null : letter}
    </span>
  );
}
