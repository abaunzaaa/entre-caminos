import underConstruction from "../../assets/under-construction.png";

type UnderConstructionProps = {
  title: string;
};

export function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <div className="explorer-under-construction">
      <img
        src={underConstruction}
        alt=""
        className="explorer-under-construction__icon"
        width={1312}
        height={1199}
        draggable={false}
        decoding="async"
        aria-hidden="true"
      />
      <h1 className="explorer-discover-title">{title}</h1>
      <p className="explorer-discover-lead">
        Estamos trabajando para que pronto puedas disfrutar de esta funcionalidad
      </p>
    </div>
  );
}
