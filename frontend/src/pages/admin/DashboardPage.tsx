import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Compass,
  Mail,
  Shield,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  getAdminCategories,
  getAdminExperiences,
  getAdministrators,
  getDashboard,
} from "../../services/catalog.service";
import { ADMIN_AVATAR_EVENT, resolveAvatarUrl } from "../../utils/admin-avatar";
import { CountUp } from "../../components/admin/CountUp";
import { DashCardRail } from "../../components/admin/DashCardRail";
import { ExperienceCatalogCard } from "../../components/admin/ExperienceCatalogCard";
import { Panel, StatusDot } from "../../components/admin/Panel";
import { useAuth } from "../../hooks/useAuth";
import { getApiErrorMessage } from "../../utils/api-error";
import { getCategoryIcon } from "../../utils/category-icons";
import catAgregadas from "../../assets/cat-creadas.png";
import expeAgregadas from "../../assets/expe-agregadas.png";
import gifPanel from "../../assets/gif-panel.mp4";
import type { Category, DashboardStats, Experience, PublicUser } from "../../types";

function readRole(value: unknown): PublicUser["role"] | "" {
  if (typeof value === "string") {
    return value as PublicUser["role"];
  }
  if (value && typeof value === "object" && "name" in value && typeof value.name === "string") {
    return value.name as PublicUser["role"];
  }
  return "";
}

function roleLabel(role: PublicUser["role"] | "" | unknown) {
  const name = readRole(role);
  if (name === "SUPER_ADMIN") {
    return "Super administrador";
  }
  if (name === "ADMIN") {
    return "Administrador";
  }
  return "Administración";
}

function isAdministrator(value: unknown): value is PublicUser {
  if (!value || typeof value !== "object") {
    return false;
  }
  const role = readRole((value as PublicUser).role);
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function asAdministratorList(value: unknown): PublicUser[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isAdministrator);
}

function asDashboardSuperAdmins(value: unknown): PublicUser[] {
  return asAdministratorList(value).filter((item) => readRole(item.role) === "SUPER_ADMIN");
}

function countActiveTeam(users: PublicUser[]): number {
  const ids = new Set<string>();
  for (const user of users) {
    if (user.status !== "ACTIVE") {
      continue;
    }
    if (!isAdministrator(user)) {
      continue;
    }
    ids.add(user.id);
  }
  return ids.size;
}

const SUMMARY_LIMIT = 3;

function newestFirst<T extends { createdAt?: string }>(items: T[], limit = SUMMARY_LIMIT): T[] {
  return [...items]
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, limit);
}

function daysOnPlatform(createdAt: string | undefined) {
  if (!createdAt) {
    return 0;
  }
  const start = new Date(createdAt).getTime();
  if (Number.isNaN(start)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - start) / 86_400_000));
}

function daysLabel(days: number) {
  return `${days} ${days === 1 ? "día" : "días"} en la plataforma`;
}

function greetingForName(name: string) {
  const hour = new Date().getHours();
  const firstName = name.trim().split(/\s+/)[0] || name;
  if (hour >= 5 && hour < 12) {
    return `Buenos días, ${firstName}`;
  }
  if (hour >= 12 && hour < 19) {
    return `Buenas tardes, ${firstName}`;
  }
  return `Buenas noches, ${firstName}`;
}

const KPI: Array<{
  key: keyof Pick<DashboardStats, "users" | "experiences" | "categories" | "admins">;
  label: string;
  icon: LucideIcon;
}> = [
  { key: "users", label: "Viajeros registrados", icon: Users },
  { key: "experiences", label: "Experiencias registradas", icon: Compass },
  { key: "categories", label: "Categorías registradas", icon: Tags },
  { key: "admins", label: "Personas en el equipo", icon: UserRound },
];

export function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const canReview = hasPermission("experiences.review");
  const isStaffAdmin = user?.role === "ADMIN";
  const [metrics, setMetrics] = useState<DashboardStats | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [admins, setAdmins] = useState<PublicUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [experiencesLoading, setExperiencesLoading] = useState(true);
  const [photo, setPhoto] = useState<string | null>(() => resolveAvatarUrl(user));

  useEffect(() => {
    setPhoto(resolveAvatarUrl(user));
  }, [user, user?.id, user?.avatarUrl]);

  useEffect(() => {
    function syncPhoto() {
      setPhoto(resolveAvatarUrl(user));
    }
    window.addEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
    window.addEventListener("storage", syncPhoto);
    return () => {
      window.removeEventListener(ADMIN_AVATAR_EVENT, syncPhoto);
      window.removeEventListener("storage", syncPhoto);
    };
  }, [user, user?.id, user?.avatarUrl]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    async function loadSummary() {
      setAdminsLoading(true);
      setAdminsError("");
      setCategoriesLoading(true);
      setCategoriesError("");
      setExperiencesLoading(true);

      const [dashResult, categoriesResult, adminsResult, experiencesResult] = await Promise.allSettled([
        getDashboard(),
        getAdminCategories({ limit: SUMMARY_LIMIT }),
        getAdministrators(),
        getAdminExperiences({ limit: 10 }),
      ]);
      if (cancelled) {
        return;
      }

      const dash = dashResult.status === "fulfilled" ? dashResult.value : null;
      const fromDashCategories = Array.isArray(dash?.recentCategories) ? dash.recentCategories : [];
      const fromCategoriesEndpoint =
        categoriesResult.status === "fulfilled" && Array.isArray(categoriesResult.value)
          ? categoriesResult.value
          : [];
      const visibleCategories = newestFirst(
        (fromDashCategories.length > 0 ? fromDashCategories : fromCategoriesEndpoint).filter(
          (category) => !category.status || category.status === "APPROVED",
        ),
      );
      setCategories(visibleCategories);
      setCategoriesLoading(false);
      setCategoriesError(
        visibleCategories.length === 0 &&
          dashResult.status === "rejected" &&
          categoriesResult.status === "rejected"
          ? getApiErrorMessage(categoriesResult.reason, "No se pudieron cargar las categorías.")
          : "",
      );

      const fromDashAdmins = asDashboardSuperAdmins(dash?.administrators);
      const fromAdminsEndpoint =
        adminsResult.status === "fulfilled" ? asDashboardSuperAdmins(adminsResult.value) : [];
      const visibleAdmins = newestFirst(fromDashAdmins.length > 0 ? fromDashAdmins : fromAdminsEndpoint);
      setAdmins(visibleAdmins);
      setAdminsLoading(false);
      setAdminsError(
        visibleAdmins.length === 0 && dashResult.status === "rejected" && adminsResult.status === "rejected"
          ? getApiErrorMessage(adminsResult.reason, "No se pudieron cargar los administradores.")
          : "",
      );

      if (dash && typeof dash.admins === "number") {
        setMetrics(dash);
      } else {
        setMetrics({
          users: 0,
          experiences: 0,
          categories: 0,
          published: 0,
          admins: countActiveTeam(fromAdminsEndpoint),
        });
      }

      const fromDashExperiences = Array.isArray(dash?.recentExperiences) ? dash.recentExperiences : [];
      const fromExperiencesEndpoint =
        experiencesResult.status === "fulfilled" ? experiencesResult.value : [];
      setExperiences(fromDashExperiences.length > 0 ? fromDashExperiences : fromExperiencesEndpoint);
      setExperiencesLoading(false);
    }

    void loadSummary();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const fullName = user?.name?.trim() || "Administrador";
  const initial = fullName.charAt(0).toUpperCase() || "A";
  const createdCategories = metrics?.createdCategories ?? 0;
  const createdExperiences = metrics?.createdExperiences ?? 0;
  return (
    <div className="dash">
      <article id="admin-profile-summary-card" className="dash-profile">
        <div className="dash-profile__top">
          <span className="dash-profile__photo" aria-hidden="true">
            {photo ? <img src={photo} alt="" /> : initial}
          </span>
          <div className="dash-profile__identity">
            <h1 className="dash-profile__name">{greetingForName(fullName)}</h1>
            <p className="dash-profile__row">
              <Shield size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>{roleLabel(user?.role ?? "ADMIN")}</span>
            </p>
            <p className="dash-profile__row">
              <Clock size={16} strokeWidth={1.7} aria-hidden="true" />
              <span>{daysLabel(daysOnPlatform(user?.createdAt))}</span>
            </p>
            {user?.email ? (
              <p className="dash-profile__row">
                <Mail size={16} strokeWidth={1.7} aria-hidden="true" />
                <span>{user.email}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div id="dashboard-metrics-images" className="dash-profile__stats">
          <div className="dash-profile__stat">
            <img src={catAgregadas} alt="" className="dash-profile__stat-art dash-float-art" />
            <p className="dash-profile__stat-label">Categorías creadas</p>
            <p className="dash-profile__stat-value">
              <CountUp value={createdCategories} />
            </p>
          </div>
          <div className="dash-profile__stat">
            <img src={expeAgregadas} alt="" className="dash-profile__stat-art dash-float-art" />
            <p className="dash-profile__stat-label">Experiencias agregadas</p>
            <p className="dash-profile__stat-value">
              <CountUp value={createdExperiences} />
            </p>
          </div>
        </div>
      </article>
      <section id="dashboard-summary-cards-layout" className="admin-kpi-grid" aria-label="Indicadores principales">
        {KPI.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.key} className="admin-kpi-card">
              <div className="admin-kpi-card__head">
                <span className="dash-kpi__icon">
                  <Icon size={18} strokeWidth={1.7} />
                </span>
                <p className="admin-kpi-card__label">{card.label}</p>
              </div>
              <p className="admin-kpi-card__value">
                <CountUp value={metrics?.[card.key] ?? 0} />
              </p>
            </article>
          );
        })}
      </section>

      <section className="dash-split" aria-label="Resumen de administradores y categorías">
        <aside className="dash-split__media" aria-hidden="true">
          <video
            className="dash-split__video"
            src={gifPanel}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
          />
        </aside>
        <div className="dash-split__cards">
          <article className="dash-split__panel">
            <div className="dash-split__intro">
              <h2 className="dash-section__title">Super administradores</h2>
              <p className="dash-section__lead">Últimos registrados</p>
            </div>
            {adminsLoading ? (
              <Panel className="dash-empty">
                <p>Cargando administradores…</p>
              </Panel>
            ) : adminsError ? (
              <Panel className="dash-empty">
                <p>{adminsError}</p>
              </Panel>
            ) : admins.length === 0 ? (
              <Panel className="dash-empty">
                <p>No hay super administradores registrados.</p>
              </Panel>
            ) : (
              <div className="dash-split__list">
                {admins.map((admin) => {
                  const avatar = resolveAvatarUrl(admin);
                  const initial = admin.name.trim().charAt(0).toUpperCase() || "A";
                  return (
                    <article key={admin.id} className="dash-team-card">
                      <span className="dash-team-card__avatar">
                        {avatar ? <img src={avatar} alt="" /> : initial}
                      </span>
                      <div className="dash-team-card__info">
                        <h3>{admin.name}</h3>
                        <p className="dash-team-card__email">{admin.email}</p>
                        <div className="dash-team-card__facts">
                          <StatusDot active>{roleLabel(admin.role)}</StatusDot>
                          <StatusDot active={admin.status === "ACTIVE"}>
                            {admin.status === "ACTIVE" ? "Activo" : "Inactivo"}
                          </StatusDot>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <Link to="/admin/administradores" className="admin-cta dash-split__action">
              {isStaffAdmin ? "Ver todos" : "Añadir administrador"}
            </Link>
          </article>
          <article className="dash-split__panel">
            <div className="dash-split__intro">
              <h2 className="dash-section__title">Categorías</h2>
              <p className="dash-section__lead">Últimas registradas</p>
            </div>
            {categoriesLoading ? (
              <Panel className="dash-empty">
                <p>Cargando categorías…</p>
              </Panel>
            ) : categoriesError ? (
              <Panel className="dash-empty">
                <p>{categoriesError}</p>
              </Panel>
            ) : categories.length === 0 ? (
              <Panel className="dash-empty">
                <p>Aún no hay categorías registradas.</p>
              </Panel>
            ) : (
              <div className="dash-split__list">
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.icon);
                  const count = category._count?.experiences ?? 0;
                  return (
                    <article key={category.id} className="dash-cat-card">
                      <span className="dash-cat-card__icon">
                        <Icon size={20} strokeWidth={1.7} />
                      </span>
                      <div>
                        <h3>{category.name}</h3>
                        <p>
                          {count} {count === 1 ? "experiencia" : "experiencias"}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <Link to="/admin/categorias" className="admin-cta dash-split__action">
              Añadir categoría
            </Link>
          </article>
        </div>
      </section>

      <section className="dash-section">
        <div className="dash-section__head">
          <div>
            <h2 className="dash-section__title">Experiencias registradas</h2>
            <p className="dash-section__lead">Últimas experiencias añadidas</p>
          </div>
          <div className="dash-section__actions">
            <Link to="/admin/experiencias" className="dash-section__glass">
              Ver más
            </Link>
            <Link to="/admin/experiencias/nueva" className="admin-cta dash-section__cta">
              Añadir experiencia
            </Link>
          </div>
        </div>
        {experiencesLoading ? (
          <Panel className="dash-empty">
            <p>Cargando experiencias…</p>
          </Panel>
        ) : experiences.length === 0 ? (
          <Panel className="dash-empty">
            <p>Aún no hay experiencias registradas.</p>
          </Panel>
        ) : (
          <DashCardRail label="Experiencias registradas" className="dash-card-rail--experiences" scrollerClassName="dash-exp-grid">
            {experiences.map((item) => (
              <ExperienceCatalogCard
                key={item.id}
                experience={item}
                canReview={canReview}
                showManage={false}
              />
            ))}
          </DashCardRail>
        )}
      </section>

    </div>
  );
}
