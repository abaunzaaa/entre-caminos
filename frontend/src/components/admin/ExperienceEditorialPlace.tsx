import { Car, Leaf, MapPin, Tag } from "lucide-react";
import { ExperienceLocationMap } from "./ExperienceLocationMap";
import { parseStoredLocation } from "../../data/colombia-locations";
import type { Experience } from "../../types";
import mapaIcon from "../../assets/mapa-icon.png";

const MEDELLIN = { lat: 6.2476, lng: -75.5658 };

function mapsUrl(latitude: number | null, longitude: number | null, location?: string) {
  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (location?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
  }
  return "";
}

function minutesFromMedellin(latitude: number, longitude: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(latitude - MEDELLIN.lat);
  const dLng = toRad(longitude - MEDELLIN.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(MEDELLIN.lat)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
  const km = 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
  return Math.round(((km / 42) * 60) / 5) * 5;
}

function isUrbanAddress(address: string) {
  return /(?:calle|carrera|cra\.?|cll?\.?|avenida|av\.?|transversal|tv\.?|diagonal|dg\.?|#)/i.test(address);
}

function destinationNote(municipality: string, department: string, category: string, title: string) {
  if (!municipality) {
    return "";
  }
  const blob = `${category} ${title}`.toLowerCase();
  if (/cerám/.test(blob)) {
    return `${municipality} es reconocido por su tradición artesanal y sus piezas de cerámica hechas a mano.`;
  }
  if (/arte|artesanal|taller|oficio/.test(blob)) {
    return `${municipality} es reconocido por su tradición artesanal y sus oficios hechos a mano.`;
  }
  if (category && department) {
    return `${municipality} es un destino para vivir experiencias de ${category.toLowerCase()} en ${department}.`;
  }
  if (department) {
    return `${municipality} invita a descubrir este rincón de ${department}.`;
  }
  return "";
}

export function ExperienceEditorialPlace({
  experience,
  latitude,
  longitude,
  hasPoint,
}: {
  experience: Experience;
  latitude: number | null;
  longitude: number | null;
  hasPoint: boolean;
}) {
  const parsed = parseStoredLocation(experience.location || "");
  const municipality = parsed.municipality;
  const department = parsed.department;
  const place = [municipality, department].filter(Boolean).join(", ");
  const address = parsed.address.trim();
  const mapsHref = mapsUrl(latitude, longitude, experience.location);
  const category = experience.category?.name || "";
  const artisan = /arte|artesanal|cerám|taller|oficio/i.test(`${category} ${experience.title}`);
  const travelMinutes =
    hasPoint && department === "Antioquia" && municipality !== "Medellín"
      ? minutesFromMedellin(latitude as number, longitude as number)
      : null;
  const chips = [
    ...(travelMinutes && travelMinutes >= 15 && travelMinutes <= 150
      ? [{ icon: Car, label: `${travelMinutes} min desde Medellín` }]
      : municipality === "Medellín"
        ? [{ icon: Car, label: "En Medellín" }]
        : []),
    ...(isUrbanAddress(address)
      ? [{ icon: MapPin, label: "Zona urbana" }]
      : municipality
        ? [{ icon: MapPin, label: municipality }]
        : []),
    ...(artisan
      ? [{ icon: Leaf, label: "Tradición artesanal" }]
      : category
        ? [{ icon: Tag, label: category }]
        : []),
  ];
  const note = destinationNote(municipality, department, category, experience.title);

  return (
    <section className="dash-exps-place" aria-label="Mapa de la experiencia">
      <header className="dash-exps-place__intro">
        <img className="dash-exps-place__bloom" src={mapaIcon} alt="" />
        <h2 className="dash-exps-place__title">El destino</h2>
        <p className="dash-exps-place__lead">Conoce dónde ocurre esta experiencia</p>
      </header>

      <article className="dash-exps-place__postcard">
        {hasPoint ? (
          <div className="dash-exps-place__stage">
            <div className="dash-exps-place__frame">
              <ExperienceLocationMap latitude={latitude} longitude={longitude} zoom={15} interactive={false} />
            </div>
            <aside className="dash-exps-place__glass">
              {place ? (
                <p className="dash-exps-place__glass-place">
                  <MapPin size={13} strokeWidth={1.7} aria-hidden="true" />
                  <span>{place}</span>
                </p>
              ) : null}
              <p className="dash-exps-place__glass-title">{experience.title}</p>
              {address ? <p className="dash-exps-place__glass-address">{address}</p> : null}
              {mapsHref ? (
                <a className="dash-exps-place__maps" href={mapsHref} target="_blank" rel="noopener noreferrer">
                  Abrir ubicación →
                </a>
              ) : null}
            </aside>
          </div>
        ) : (
          <p className="dash-exps-place__empty">Esta experiencia aún no tiene un punto geográfico registrado.</p>
        )}

        {chips.length || note ? (
          <div className="dash-exps-place__extra">
            {chips.length ? (
              <ul className="dash-exps-place__chips">
                {chips.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <li key={chip.label}>
                      <Icon size={13} strokeWidth={1.7} aria-hidden="true" />
                      <span>{chip.label}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {note ? <p className="dash-exps-place__note">{note}</p> : null}
          </div>
        ) : null}
      </article>
    </section>
  );
}
