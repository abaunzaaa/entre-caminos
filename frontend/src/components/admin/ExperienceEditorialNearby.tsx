import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { parseStoredLocation } from "../../data/colombia-locations";
import { getAdminExperiences } from "../../services/catalog.service";
import { experienceImages, mediaUrl } from "../../utils/media";
import type { Experience } from "../../types";
import floresIcon from "../../assets/flores-icon.png";

const NEARBY_LIMIT = 3;

function normalizePlace(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^el\s+/, "");
}

function experienceCoords(item: Experience) {
  const lat = Number(item.latitude);
  const lng = Number(item.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function distanceKm(from: Experience, to: Experience) {
  const origin = experienceCoords(from);
  const target = experienceCoords(to);
  if (!origin || !target) {
    return Number.POSITIVE_INFINITY;
  }
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(target.lat - origin.lat);
  const dLng = toRad(target.lng - origin.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(origin.lat)) * Math.cos(toRad(target.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function pickNearbyExperiences(current: Experience, list: Experience[]) {
  const currentPlace = parseStoredLocation(current.location || "");
  const currentMunicipality = normalizePlace(currentPlace.municipality);
  const currentDepartment = normalizePlace(currentPlace.department);
  const others = list.filter((item) => item.id !== current.id);

  function rank(item: Experience) {
    const place = parseStoredLocation(item.location || "");
    const municipality = normalizePlace(place.municipality);
    const department = normalizePlace(place.department);
    const sameMunicipality = Boolean(currentMunicipality && municipality === currentMunicipality);
    const sameDepartment = Boolean(currentDepartment && department === currentDepartment);
    return {
      item,
      sameMunicipality,
      sameDepartment,
      distance: distanceKm(current, item),
    };
  }

  return others
    .map(rank)
    .sort((left, right) => {
      if (left.sameMunicipality !== right.sameMunicipality) {
        return left.sameMunicipality ? -1 : 1;
      }
      if (left.sameDepartment !== right.sameDepartment) {
        return left.sameDepartment ? -1 : 1;
      }
      if (left.distance !== right.distance) {
        return left.distance - right.distance;
      }
      return left.item.title.localeCompare(right.item.title, "es");
    })
    .slice(0, NEARBY_LIMIT)
    .map((entry) => entry.item);
}

export function ExperienceEditorialNearby({
  experience,
  footer,
}: {
  experience: Experience;
  footer?: ReactNode;
}) {
  const [nearby, setNearby] = useState<Experience[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    getAdminExperiences({ status: "PUBLISHED" })
      .then((list) => {
        if (!active) {
          return;
        }
        setNearby(pickNearbyExperiences(experience, list));
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setNearby([]);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [experience]);

  if (!loaded || (!nearby.length && !footer)) {
    return null;
  }

  return (
    <section className="dash-exps-nearby" aria-label="Experiencias cercanas">
      {nearby.length ? (
        <>
          <header className="dash-exps-nearby__intro">
            <img className="dash-exps-nearby__bloom" src={floresIcon} alt="" />
            <h2 className="dash-exps-nearby__title">Experiencias cercanas</h2>
            <p className="dash-exps-nearby__lead">Descubre otros lugares y actividades cerca de este destino</p>
          </header>
          <div className="dash-exps-nearby__grid">
            {nearby.map((item) => {
              const photo = mediaUrl(experienceImages(item)[0] ?? null);
              const itemPlace = parseStoredLocation(item.location || "");
              const caption = [itemPlace.municipality, itemPlace.department].filter(Boolean).join(" · ");
              return (
                <Link key={item.id} className="dash-exps-nearby__card" to={`/admin/experiencias/${item.id}/ver`}>
                  <span className="dash-exps-nearby__photo">
                    <img src={photo} alt="" />
                    <span className="dash-exps-nearby__glass">Ver</span>
                  </span>
                  <span className="dash-exps-nearby__body">
                    <span className="dash-exps-nearby__name">{item.title}</span>
                    {caption ? (
                      <span className="dash-exps-nearby__place">
                        <MapPin size={13} strokeWidth={1.7} aria-hidden="true" />
                        <span>{caption}</span>
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      ) : null}
      {footer ? <div className="dash-exps-nearby__close">{footer}</div> : null}
    </section>
  );
}
