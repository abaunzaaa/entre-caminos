import { Check, Users } from "lucide-react";
import type { Role } from "../../types";
import { isExplorerRole, peopleLabel, roleCapabilities, roleCopy } from "../../utils/access-copy";

export function AccessRoleCard({
  role,
  selected,
  onSelect,
}: {
  role: Role;
  selected: boolean;
  onSelect: () => void;
}) {
  const copy = roleCopy(role.name);
  const Icon = copy.icon;
  const people = role._count?.users ?? 0;
  const capabilities = roleCapabilities(role);
  const explorer = isExplorerRole(role.name);

  return (
    <button
      type="button"
      className={`dash-access-role${selected ? " is-selected" : ""}${explorer ? " is-explorer" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="dash-access-role__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <h3 className="dash-access-role__title">{copy.title}</h3>
      <p className="dash-access-role__lead">{copy.description}</p>
      <p className="dash-access-role__count">
        <Users size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>{peopleLabel(people)}</span>
      </p>
      <p className="dash-access-role__can">{copy.canLabel}</p>
      <ul className="dash-access-role__list">
        {capabilities.map((item, index) => (
          <li key={`${item.capability}-${index}`}>
            <Check size={14} strokeWidth={2.2} aria-hidden="true" />
            <span>{item.capability}</span>
          </li>
        ))}
      </ul>
      {explorer ? <p className="dash-access-role__note">Sin acceso administrativo.</p> : null}
    </button>
  );
}
