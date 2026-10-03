import { useEffect, useState } from "react";
import {
  Cake,
  CalendarDays,
  KeyRound,
  Leaf,
  Mail,
  MapPin,
  Music,
  Phone,
  Sparkles,
  Star,
  Stamp,
  Sun,
  Trash2,
  UserRound,
  Users,
  VenusAndMars,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import encabezado from "../assets/encabezado.png";
import { getPreferenceLabel } from "../data/onboarding";
import { AvatarPreview } from "../components/onboarding/AvatarPreview";
import { UnderConstruction } from "../components/explorer/UnderConstruction";
import { ChangePasswordModal } from "../components/auth/ChangePasswordModal";
import { DeleteAccountModal } from "../components/auth/DeleteAccountModal";
import { EditProfileModal } from "../components/profile/EditProfileModal";
import { useAuth } from "../hooks/useAuth";
import { listFavoriteExperiences } from "../services/favorites.service";
import { onFavoritesChanged } from "../services/favorites-sync";
import type { Experience, PublicUser } from "../types";
import { mediaUrl } from "../utils/media";
import { profileToForm, type OnboardingForm } from "../utils/onboarding";
import { roleCopy } from "../utils/access-copy";
import { formatPersonName } from "../utils/person-name";
import "../styles/experience-editorial-dossier.css";
import "../styles/experience-editorial-gallery.css";
import "../styles/onboarding.css";
import "../styles/profile-view.css";

type ProfileTab = "informacion" | "agenda" | "resenas" | "estampitas";

type ProfileField = {
  label: string;
  icon: LucideIcon;
  text: string;
  chips?: string[];
};

function preferenceField(values: string[]): Pick<ProfileField, "text" | "chips"> {
  const labels = preferenceLabels(values);
  if (labels.length > 1) {
    return { text: "", chips: labels };
  }
  return { text: labels[0] ?? "" };
}

const TABS: Array<{ id: ProfileTab; label: string; icon: LucideIcon }> = [
  { id: "informacion", label: "Información", icon: UserRound },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "resenas", label: "Reseñas", icon: Star },
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

function preferenceLabels(values: string[]) {
  return values.map((value) => getPreferenceLabel(value)).filter(Boolean);
}

function profilePlace(form: OnboardingForm) {
  return [form.department, form.city].map((part) => part.trim()).filter(Boolean).join(" · ");
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
  const form = profileToForm(user?.profile);
  const storedName = user?.name?.trim() ?? "";
  const displayName = formatPersonName(storedName) || storedName || "Tu perfil";
  const location = profilePlace(form);
  const roleLabel = roleCopy(user?.role ?? "USER").title;
  const status = accountStatus(user?.status);
  const photo = form.localPhotoUrl || (form.profileImageUrl ? mediaUrl(form.profileImageUrl) : "");
  const phone = displayPhone(user?.phone);
  const email = user?.email?.trim() ?? "";
  const [tab, setTab] = useState<ProfileTab>("informacion");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
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

  const personalRows: ProfileField[] = [
    { label: "Nombre", icon: UserRound, text: storedName ? displayName : "" },
    { label: "Ubicación", icon: MapPin, text: location },
    { label: "Correo", icon: Mail, text: email },
    { label: "Número", icon: Phone, text: phone },
    { label: "Edad", icon: Cake, text: form.age },
    { label: "Género", icon: VenusAndMars, text: form.gender },
  ];
  const preferenceRows: ProfileField[] = [
    { label: "Intereses", icon: Sparkles, ...preferenceField(form.interests) },
    { label: "Ambientes", icon: Leaf, ...preferenceField(form.places) },
    { label: "Presupuesto", icon: Wallet, ...preferenceField(form.budget) },
    { label: "Compañía", icon: Users, ...preferenceField(form.companions) },
    { label: "Música", icon: Music, ...preferenceField(form.music) },
    { label: "Clima", icon: Sun, ...preferenceField(form.climate) },
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
            <div className="profile-info-layout">
              <div className="profile-info-actions">
                <button type="button" className="tourist-hero__cta" onClick={() => setEditOpen(true)}>
                  Editar perfil
                </button>
              </div>
              <div className="profile-info-groups">
                {(
                  [
                    { id: "profile-data-title", title: "Mis datos", rows: personalRows },
                    { id: "profile-prefs-title", title: "Mis preferencias", rows: preferenceRows },
                  ] as const
                ).map((group) => (
                  <section key={group.id} className="profile-info-card" aria-labelledby={group.id}>
                    <h2 id={group.id} className="dash-exps-dossier__kicker">
                      {group.title}
                    </h2>
                    <dl className="dash-exps-dossier__facts">
                      {group.rows.map((row) => {
                        const Icon = row.icon;
                        const chips = row.chips ?? [];
                        const empty = !row.text && chips.length === 0;
                        return (
                          <div key={row.label} className="dash-exps-dossier__row">
                            <div className="dash-exps-dossier__copy">
                              <dt className="dash-exps-dossier__label">
                                <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                                {row.label}
                              </dt>
                              <dd className={`dash-exps-dossier__value${empty ? " is-empty" : ""}`}>
                                {empty ? (
                                  "Sin completar"
                                ) : chips.length > 1 ? (
                                  <ul className="profile-chips">
                                    {chips.map((chip) => (
                                      <li key={chip}>{chip}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  row.text
                                )}
                              </dd>
                            </div>
                          </div>
                        );
                      })}
                    </dl>
                  </section>
                ))}
              </div>

              <section className="profile-info-card" aria-labelledby="profile-security-title">
                <h2 id="profile-security-title" className="dash-exps-dossier__kicker">
                  Seguridad
                </h2>
                <dl className="dash-exps-dossier__facts">
                  <div className="dash-exps-dossier__row">
                    <div className="dash-exps-dossier__copy">
                      <dt className="dash-exps-dossier__label">Contraseña</dt>
                      <dd className="dash-exps-dossier__value">
                        <button type="button" className="dash-exps-editorial__favorite" onClick={() => setPasswordOpen(true)}>
                          <KeyRound size={14} strokeWidth={1.8} aria-hidden="true" />
                          <span>Cambiar contraseña</span>
                        </button>
                      </dd>
                    </div>
                  </div>
                  <div className="dash-exps-dossier__row">
                    <div className="dash-exps-dossier__copy">
                      <dt className="dash-exps-dossier__label">Cuenta</dt>
                      <dd className="dash-exps-dossier__value">
                        <button type="button" className="dash-exps-editorial__favorite" onClick={() => setDeleteOpen(true)}>
                          <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                          <span>Eliminar cuenta</span>
                        </button>
                      </dd>
                    </div>
                  </div>
                </dl>
              </section>
            </div>
          ) : null}

          {tab === "agenda" ? (
            <div className="profile-agenda">
              <UnderConstruction title="AGENDA" />
            </div>
          ) : null}

          {tab === "resenas" ? (
            <div className="profile-reviews">
              <UnderConstruction title="RESEÑAS" />
            </div>
          ) : null}

          {tab === "estampitas" ? (
            <div className="profile-visited">
              <UnderConstruction title="ESTAMPITAS" />
            </div>
          ) : null}
        </div>
      </section>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
