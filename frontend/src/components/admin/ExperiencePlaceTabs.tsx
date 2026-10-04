type ExperiencePlaceTabsProps = {
  label: string;
  tabs: string[];
  active: number;
  onSelect: (index: number) => void;
  onAdd?: () => void;
  addLabel?: string;
};

export function ExperiencePlaceTabs({
  label,
  tabs,
  active,
  onSelect,
  onAdd,
  addLabel = "Agregar ubicación",
}: ExperiencePlaceTabsProps) {
  return (
    <div className="dash-exps-places">
      <span className="dash-exps-places__label">{label}</span>
      <div className="dash-exps-places__tabs" role="tablist" aria-label={label}>
        {tabs.map((tab, index) => (
          <button
            key={`${tab}-${index}`}
            type="button"
            role="tab"
            aria-selected={index === active}
            className={`dash-exps-places__tab${index === active ? " is-active" : ""}`}
            onClick={() => onSelect(index)}
          >
            {tab}
          </button>
        ))}
        {onAdd ? (
          <button type="button" className="dash-exps-places__tab dash-exps-places__tab--add" onClick={onAdd}>
            + {addLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
