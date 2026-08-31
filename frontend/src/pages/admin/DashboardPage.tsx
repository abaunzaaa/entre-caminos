import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminExperiences, getDashboard } from "../../services/catalog.service";
import { mediaUrl } from "../../utils/media";
import { Panel } from "../../components/admin/Panel";
import type { Experience } from "../../types";

type Metrics = {
  users: number;
  experiences: number;
  published: number;
  categories: number;
  admins: number;
  recentLogs: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    user: { name: string };
  }>;
};

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Ingresó",
  REGISTER: "Se registró",
  CATEGORY_CREATE: "Creó una categoría",
  CATEGORY_UPDATE: "Editó una categoría",
  CATEGORY_DELETE: "Eliminó una categoría",
  EXPERIENCE_CREATE: "Publicó una experiencia",
  EXPERIENCE_UPDATE: "Actualizó una experiencia",
  EXPERIENCE_DELETE: "Eliminó una experiencia",
  ADMIN_CREATE: "Invitó a un administrador",
  ADMIN_UPDATE: "Actualizó un administrador",
};

export function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [published, setPublished] = useState<Experience[]>([]);

  useEffect(() => {
    getDashboard().then(setMetrics).catch(() => setMetrics(null));
    getAdminExperiences()
      .then((list) => setPublished(list.filter((item) => item.status === "PUBLISHED").slice(0, 4)))
      .catch(() => setPublished([]));
  }, []);

  const cards = [
    { label: "Viajeros", value: metrics?.users ?? 0 },
    { label: "Experiencias", value: metrics?.experiences ?? 0 },
    { label: "Al aire", value: metrics?.published ?? 0 },
    { label: "Categorías", value: metrics?.categories ?? 0 },
    { label: "Equipo", value: metrics?.admins ?? 0 },
  ];

  return (
    <div className="space-y-10">
      <div className="grid border border-black md:grid-cols-5">
        {cards.map((card, index) => (
          <article
            key={card.label}
            className={`bg-white px-6 py-8 ${index !== 0 ? "md:border-l md:border-black" : ""}`}
          >
            <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-500">{card.label}</p>
            <p className="mt-4 font-serif text-5xl italic">{card.value}</p>
          </article>
        ))}
      </div>

      <div>
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-3xl italic">En vitrina</h2>
          <Link to="/admin/experiencias" className="text-[11px] uppercase tracking-[0.2em] underline underline-offset-4">
            Ver todas
          </Link>
        </div>
        {published.length === 0 ? (
          <Panel className="px-8 py-16 text-center">
            <p className="font-serif text-2xl italic">Aún no hay piezas publicadas.</p>
            <Link to="/admin/experiencias/nueva" className="mt-6 inline-flex rounded-full bg-charcoal px-8 py-3 text-sm text-white">
              Crear la primera
            </Link>
          </Panel>
        ) : (
          <div className="grid gap-0 border border-black sm:grid-cols-2 lg:grid-cols-4">
            {published.map((item) => (
              <Link key={item.id} to={`/admin/experiencias/${item.id}`} className="group border-black sm:border-r last:border-r-0">
                <img
                  src={mediaUrl(item.imageUrl)}
                  alt={item.title}
                  className="aspect-square w-full object-cover"
                />
                <div className="border-t border-black px-4 py-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{item.location}</p>
                  <p className="mt-1 font-serif text-lg leading-tight group-hover:underline">{item.title}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Panel className="px-8 py-8">
        <h2 className="font-serif text-3xl italic">Bitácora</h2>
        <ul className="mt-6 divide-y divide-black/15">
          {(metrics?.recentLogs ?? []).length === 0 && (
            <li className="py-6 text-sm text-neutral-500">Sin actividad reciente.</li>
          )}
          {(metrics?.recentLogs ?? []).map((log) => (
            <li key={log.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4 text-sm">
              <span>
                <span className="font-medium">{log.user.name}</span>
                <span className="text-neutral-500">
                  {" "}
                  · {ACTION_LABEL[log.action] ?? log.action} · {log.entity}
                </span>
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
                {new Date(log.createdAt).toLocaleString("es-CO")}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
