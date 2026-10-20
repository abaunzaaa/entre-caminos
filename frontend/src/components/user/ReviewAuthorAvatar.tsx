import { useEffect, useState } from "react";
import { mediaUrl } from "../../utils/media";
import { snapshotAvatarConfig } from "../../utils/avatar-snapshot";
import { reviewAuthorAvatarConfig, reviewAuthorPhotoUrl, type ReviewAuthor } from "../../utils/review-author";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase());
  return letters.join("") || "EC";
}

export function ReviewAuthorAvatar({
  user,
  className,
  size = 80,
}: {
  user: ReviewAuthor;
  className: string;
  size?: number;
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [dollFailed, setDollFailed] = useState(false);
  const [doll, setDoll] = useState<string | null>(null);
  const photoUrl = photoFailed ? "" : reviewAuthorPhotoUrl(user);
  const config = reviewAuthorAvatarConfig(user, photoFailed);
  const configKey = config ? JSON.stringify(config) : "";

  useEffect(() => {
    setPhotoFailed(false);
    setDollFailed(false);
  }, [user.id, user.avatarUrl, user.profile?.profileImageUrl, user.profile?.profileImageType]);

  useEffect(() => {
    if (photoUrl || !config) {
      setDoll(null);
      return;
    }
    let cancelled = false;
    void snapshotAvatarConfig(config, Math.max(size * 2, 128))
      .then((url) => {
        if (!cancelled) {
          setDoll(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDollFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [photoUrl, config, configKey, size]);

  const src = photoUrl ? mediaUrl(photoUrl, 240) : !dollFailed ? doll : "";
  const waiting = !src && Boolean(config) && !dollFailed;

  return (
    <span className={className} aria-hidden="true">
      {src ? (
        <img
          src={src}
          alt=""
          onError={() => {
            if (photoUrl) {
              setPhotoFailed(true);
              return;
            }
            setDollFailed(true);
          }}
        />
      ) : waiting ? null : (
        initials(user.name)
      )}
    </span>
  );
}
