import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Shield, Stamp, UserRound, type LucideIcon } from "lucide-react";
import encabezado from "../assets/encabezado.png";
import { getPreferenceLabel } from "../data/onboarding";
import { AvatarPreview } from "../components/onboarding/AvatarPreview";
import {
  BouquetIcon,
  CheersIcon,
  LandscapeIcon,
  RecordPlayerIcon,
  SunFaceIcon,
  WalletIcon,
} from "../components/onboarding/SummaryLineIcons";
import { UnderConstruction } from "../components/explorer/UnderConstruction";
import { Button } from "../components/ui/Button";
import { KeyConfirmDialog } from "../components/ui/KeyConfirmDialog";
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

type ProfileTab = "informacion" | "intereses" | "seguridad" | "estampitas";

const TABS: Array<{ id: ProfileTab; label: string; icon: LucideIcon }> = [
  { id: "informacion", label: "Información", icon: UserRound },
  { id: "intereses", label: "Intereses", icon: Heart },
  { id: "seguridad", label: "Seguridad", icon: Shield },
  { id: "estampitas", label: "Estampitas", icon: Stamp },
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

function preferenceText(values: string[]) {
  return values.map((value) => getPreferenceLabel(value)).filter(Boolean).join(" · ");
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
  const [deleteOpen, setDeleteOpen] = useState(false);
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
    { id: "visited", label: "Visitados", value: 0, tab: "estampitas" },
    { id: "reviews", label: "Reseñas", value: 0 },
    {
      id: "favorites",
      label: "Favoritos",
      value: favoritesError ? null : favoritesLoading ? null : favorites.length,
    },
  ];

  const preferenceCards: Array<{ id: string; title: string; icon: ReactNode; values: string[] }> = [
    { id: "intereses", title: "Intereses", icon: <BouquetIcon />, values: form.interests },
    { id: "ambientes", title: "Ambientes", icon: <LandscapeIcon />, values: form.places },
    { id: "presupuesto", title: "Presupuesto", icon: <WalletIcon />, values: form.budget },
    { id: "compania", title: "Compañía", icon: <CheersIcon />, values: form.companions },
    { id: "musica", title: "Música", icon: <RecordPlayerIcon />, values: form.music },
    { id: "clima", title: "Clima", icon: <SunFaceIcon />, values: form.climate },
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

          {tab === "intereses" ? (
            <div className="profile-interests">
              {preferenceCards.map((card) => {
                const text = preferenceText(card.values);
                return (
                  <section key={card.id} className="profile-info-card" aria-labelledby={`profile-pref-${card.id}`}>
                    <h2 id={`profile-pref-${card.id}`} className="profile-info-card__title profile-info-card__title--icon">
                      <span className="profile-info-card__glyph" aria-hidden="true">
                        {card.icon}
                      </span>
                      {card.title}
                    </h2>
                    <p className={`profile-info profile-info__statement${text ? "" : " is-empty"}`}>
                      {text || "Sin especificar"}
                    </p>
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === "seguridad" ? (
            <div className="profile-security">
              <section className="profile-info-card" aria-labelledby="profile-password-title">
                <h2 id="profile-password-title" className="profile-info-card__title">
                  Contraseña
                </h2>
                <dl className="profile-info">
                  <div className="profile-info__row">
                    <dt>Cambiar contraseña</dt>
                    <dd>
                      <Button type="button" onClick={() => navigate("/cambiar-contrasena")}>
                        Cambiar contraseña
                      </Button>
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="profile-info-card" aria-labelledby="profile-email-title">
                <h2 id="profile-email-title" className="profile-info-card__title">
                  Correo electrónico
                </h2>
                <dl className="profile-info">
                  <div className="profile-info__row">
                    <dt>Correo asociado</dt>
                    <dd className={email ? undefined : "is-empty"}>{email || "Sin completar"}</dd>
                  </div>
                  <div className="profile-info__row">
                    <dt>Estado</dt>
                    <dd>{user?.emailVerified ? "Correo verificado" : "Sin verificar"}</dd>
                  </div>
                </dl>
              </section>

              <section className="profile-info-card" aria-labelledby="profile-account-title">
                <h2 id="profile-account-title" className="profile-info-card__title">
                  Cuenta
                </h2>
                <dl className="profile-info">
                  <div className="profile-info__row">
                    <dt>Eliminar cuenta</dt>
                    <dd>
                      <Button
                        type="button"
                        variant="secondary"
                        className="profile-info__danger"
                        onClick={() => setDeleteOpen(true)}
                      >
                        Eliminar cuenta
                      </Button>
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          ) : null}

          {tab === "estampitas" ? (
            <div className="profile-visited">
              <UnderConstruction title="ESTAMPITAS" />
            </div>
          ) : null}
        </div>
      </section>
      <KeyConfirmDialog
        open={deleteOpen}
        title="¿Eliminar cuenta?"
        description="Confirma si quieres eliminar tu cuenta. Esta acción todavía no se puede completar."
        confirmLabel="Eliminar cuenta"
        cancelLabel="Cancelar"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => setDeleteOpen(false)}
      />
    </div>
  );
}
