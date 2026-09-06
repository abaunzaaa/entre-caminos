import type { PermissionCopy } from "../../utils/access-copy";

export function AccessPermissionCard({
  copy,
  active,
  disabled,
  busy,
  onToggle,
}: {
  copy: PermissionCopy;
  active: boolean;
  disabled?: boolean;
  busy?: boolean;
  onToggle?: () => void;
}) {
  const Icon = copy.icon;
  const className = `dash-access-perm${active ? " is-active" : " is-idle"}${disabled ? " is-locked" : ""}`;

  const content = (
    <>
      <span className="dash-access-perm__icon" aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className={`dash-access-perm__badge${active ? " is-on" : ""}`}>
        {busy ? "Actualizando..." : active ? "Activo" : "No activo"}
      </span>
      <strong className="dash-access-perm__title">{copy.title}</strong>
      <span className="dash-access-perm__lead">{copy.description}</span>
    </>
  );

  if (disabled || !onToggle) {
    return <article className={className}>{content}</article>;
  }

  return (
    <button type="button" className={className} aria-pressed={active} disabled={busy} onClick={onToggle}>
      {content}
    </button>
  );
}
