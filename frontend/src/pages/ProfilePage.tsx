import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, KeyRound, MapPinned, Shield, UserRound, type LucideIcon } from "lucide-react";
import encabezado from "../assets/encabezado.png";
import { AvatarPreview } from "../components/onboarding/AvatarPreview";
import { UnderConstruction } from "../components/explorer/UnderConstruction";
import { FavoritesLibrary } from "../components/explorer/FavoritesLibrary";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import { listFavoriteExperiences } from "../services/favorites.service";
import { onFavoritesChanged } from "../services/favorites-sync";
import type { Experience, PublicUser } from "../types";
import { mediaUrl } from "../utils/media";
import { locationSummary, profileToForm } from "../utils/onboarding";
import { roleCopy } from "../utils/access-copy";
import { formatPersonName } from "../utils/person-name";
import "../styles/onboarding.css";
import "../styles/profile-view.css";

type ProfileTab = "informacion" | "seguridad" | "favoritos" | "visitados";

const TABS: Array<{ id: ProfileTab; label: string; icon: LucideIcon }> = [
  { id: "informacion", label: "Información", icon: UserRound },
  { id: "seguridad", label: "Seguridad", icon: Shield },
  { id: "favoritos", label: "Favoritos", icon: Heart },
  { id: "visitados", label: "Visitados", icon: MapPinned },
];

function StatValue({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="profile-stat__value is-pending">—</span>;
  }
  return <span className="profile-stat__value">{value.toLocaleString("es-CO")}</span>;
}

function accountStatus(status: PublicUser["status"] | undefined) {
  if (status === "INACTIVE") {
    return { label: "Inactivo", active: false };
  }
  if (status === "SUSPENDED") {
    return { label: "Suspendido", active: false };
  }
  if (status === "ACTIVE") {
    return { label: "Activo", active: true };
  }
  return null;
}

function displayPhone(value: string | null | undefined) {
  const compact = (value ?? "").replace(/[\s.-]/g, "");
  if (!compact) {
    return "";
  }
  const hasCountry = compact.startsWith("+57");
  const national = hasCountry ? compact.slice(3) : compact.startsWith("+") ? compact.slice(1) : compact;
  if (/^3\d{9}$/.test(national) || /^60\d{8}$/.test(national)) {
    const groups = [national.slice(0, 3), national.slice(3, 6), national.slice(6, 10)].filter(Boolean);
    return `${hasCountry ? "+57 " : ""}${groups.join(" ")}`;
  }
  return value?.trim() ?? "";
}

export function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const form = profileToForm(user?.profile);
  const storedName = user?.name?.trim() ?? "";
  const displayName = formatPersonName(storedName) || storedName || "Tu perfil";
  const place = locationSummary(form);
  const roleLabel = !user || user.role === "USER" ? "Turista" : roleCopy(user.role).title;
  const status = accountStatus(user?.status);
  const photo = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");
  const phone = displayPhone(user?.phone);
  const email = user?.email?.trim() ?? "";
  const [tab, setTab] = useState<ProfileTab>("informacion");
  const [favorites, setFavorites] = useState<Experience[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [favoritesError, setFavoritesError] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      setFavorites([]);
      setFavoritesLoading(false);
      setFavoritesError("");
      return;
    }

    let cancelled = false;
    function loadFavorites(showSpinner = true) {
      if (showSpinner) {
        setFavoritesLoading(true);
      }
      setFavoritesError("");
      listFavoriteExperiences()
        .then((items) => {
          if (!cancelled) {
            setFavorites(items);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setFavorites([]);
            setFavoritesError("No pudimos cargar tus favoritos. Intenta de nuevo.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setFavoritesLoading(false);
          }
        });
    }

    loadFavorites(true);
    const unsubscribe = onFavoritesChanged(() => loadFavorites(false));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [user?.id, authLoading]);

  const photoNode =
    form.profileImageType === "PHOTO" && photo ? (
      <img src={photo} alt={displayName} />
    ) : (
      <AvatarPreview config={form.avatarConfig} size={124} label={`Avatar de ${displayName}`} />
    );

  const stats: Array<{ id: string; label: string; value: number | null; tab?: ProfileTab }> = [
    { id: "visited", label: "Lugares visitados", value: 0, tab: "visitados" },
    { id: "reviews", label: "Reseñas", value: 0 },
    {
      id: "favorites",
      label: "Favoritos",
      value: favoritesError ? null : favoritesLoading ? null : favorites.length,
      tab: "favoritos",
    },
  ];

  const infoRows = [
    { label: "Nombre", value: storedName ? displayName : "", emptyLabel: "Sin completar" },
    { label: "Ubicación", value: place, emptyLabel: "Sin completar" },
    { label: "Correo", value: email, emptyLabel: "Sin completar" },
    { label: "Número", value: phone, emptyLabel: "Sin completar" },
    { label: "Edad", value: "", emptyLabel: "No registrado" },
    { label: "Género", value: "", emptyLabel: "No registrado" },
  ];

  return (
    <div className="profile-view">
      <section className="profile-view__shell" aria-labelledby="profile-view-title">
        <header className="profile-hero">
          <div className="profile-hero__banner" style={{ backgroundImage: `url(${encabezado})` }} aria-hidden="true" />

          <div className="profile-hero__sheet">
            <div className="profile-hero__photo">{photoNode}</div>
            <div className="profile-hero__identity">
              <div className="profile-hero__copy">
                <h1 id="profile-view-title" className="profile-hero__name">
                  {displayName}
                </h1>
                <p className="profile-hero__role">{roleLabel}</p>
                {status ? (
                  <p className={`profile-hero__status${status.active ? " is-active" : ""}`}>
                    <span className="profile-hero__status-dot" aria-hidden="true" />
                    {status.label}
                  </p>
                ) : null}
              </div>
              <Button type="button" className="profile-hero__edit" onClick={() => navigate("/perfil/editar")}>
                Editar perfil
              </Button>
            </div>

            <ul className="profile-hero__stats">
              {stats.map((stat) => {
                const content = (
                  <>
                    <StatValue value={stat.value} />
                    <span className="profile-stat__label">{stat.label}</span>
                  </>
                );
                const target = stat.tab;
                if (!target) {
                  return (
                    <li key={stat.id} className="profile-stat">
                      {content}
                    </li>
                  );
                }
                return (
                  <li key={stat.id} className="profile-stat">
                    <button
                      type="button"
                      className="profile-stat__button"
                      onClick={() => setTab(target)}
                      aria-label={`${stat.label}: ${stat.value ?? "cargando"}`}
                    >
                      {content}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </header>

        <div className="profile-tabs" role="tablist" aria-label="Secciones del perfil">
          {TABS.map((item) => {
            const Icon = item.icon;
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`profile-tab-${item.id}`}
                className={`profile-tab${selected ? " is-active" : ""}`}
                aria-selected={selected}
                aria-controls={`profile-panel-${item.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.id)}
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div
          className="profile-panel"
          role="tabpanel"
          id={`profile-panel-${tab}`}
          aria-labelledby={`profile-tab-${tab}`}
        >
          {tab === "informacion" ? (
            <section className="profile-info-card" aria-labelledby="profile-info-title">
              <h2 id="profile-info-title" className="profile-info-card__title">
                Información
              </h2>
              <dl className="profile-info">
                {infoRows.map((row) => {
                  const empty = !row.value;
                  return (
                    <div key={row.label} className="profile-info__row">
                      <dt>{row.label}</dt>
                      <dd className={empty ? "is-empty" : undefined}>{empty ? row.emptyLabel : row.value}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          ) : null}

          {tab === "seguridad" ? (
            <section className="profile-security" aria-labelledby="profile-security-title">
              <h2 id="profile-security-title" className="profile-info-card__title">
                Seguridad
              </h2>
              <div className="profile-security__card">
                <span className="profile-security__icon" aria-hidden="true">
                  <KeyRound size={18} strokeWidth={1.8} />
                </span>
                <div className="profile-security__copy">
                  <p className="profile-security__label">Contraseña</p>
                  <p className="profile-security__lead">Actualiza la contraseña de tu cuenta.</p>
                </div>
                <Button type="button" onClick={() => navigate("/cambiar-contrasena")}>
                  Cambiar contraseña
                </Button>
              </div>
            </section>
          ) : null}

          {tab === "favoritos" ? (
            <div className="profile-favorites">
              {authLoading || favoritesLoading ? (
                <div className="favorites-library__status">
                  <p className="favorites-library__status-text">Cargando tus favoritos…</p>
                </div>
              ) : favoritesError ? (
                <div className="favorites-library__status">
                  <h2 className="favorites-library__title">Favoritos</h2>
                  <p className="favorites-library__status-text">{favoritesError}</p>
                </div>
              ) : (
                <FavoritesLibrary experiences={favorites} />
              )}
            </div>
          ) : null}

          {tab === "visitados" ? (
            <div className="profile-visited">
              <UnderConstruction title="VISITADOS" />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
