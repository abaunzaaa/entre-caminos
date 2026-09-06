import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  changeExperienceStatus,
  deleteExperience,
  getAdminExperiences,
} from "../../services/catalog.service";
import { mediaUrl } from "../../utils/media";
import { Panel } from "../../components/admin/Panel";
import type { Experience } from "../../types";

const statuses = ["DRAFT", "PENDING", "PUBLISHED", "ARCHIVED"] as const;
const STATUS_LABEL: Record<(typeof statuses)[number], string> = {
  DRAFT: "Borrador",
  PENDING: "Revisión",
  PUBLISHED: "Publicada",
  ARCHIVED: "Archivo",
};

export function ExperiencesPage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setExperiences(await getAdminExperiences());
  }

  useEffect(() => {
    load().catch(() => setExperiences([]));
  }, []);

  return (
    <section>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-neutral-600">
          Cada pieza se guarda en la base. Al publicarla, aparece en la vitrina pública.
        </p>
        <Link to="/admin/experiencias/nueva" className="admin-cta">
          Nueva experiencia
        </Link>
      </div>
      {error && <p className="mb-4 text-sm text-red-700">{error}</p>}
      {experiences.length === 0 ? (
        <Panel className="px-8 py-20 text-center">
          <p className="font-poppins text-3xl font-semibold tracking-[-0.02em] text-forest">El catálogo espera su primera historia.</p>
          <Link to="/admin/experiencias/nueva" className="admin-cta mt-6">
            Crear experiencia
          </Link>
        </Panel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {experiences.map((experience) => (
            <article key={experience.id} className="admin-card grid overflow-hidden md:grid-cols-[160px_1fr]">
              <img src={mediaUrl(experience.imageUrl)} alt="" className="h-40 w-full object-cover md:h-full" />
              <div className="flex flex-col justify-between p-5">
                <div>
                  <p className="text-[13px] font-medium text-neutral-500">
                    {experience.category?.name} · {experience.location}
                  </p>
                  <h2 className="mt-2 font-poppins text-2xl font-semibold leading-tight tracking-[-0.02em]">{experience.title}</h2>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <select
                    className="rounded-xl border border-forest/10 bg-white px-3 py-1.5 text-[13px] font-medium"
                    value={experience.status}
                    onChange={(e) => {
                      setError("");
                      changeExperienceStatus(experience.id, e.target.value as Experience["status"])
                        .then(load)
                        .catch(() =>
                          setError("Para publicar hace falta imagen y ubicación."),
                        );
                    }}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABEL[status]}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-4 text-[13px] font-medium">
                    <Link to={`/admin/experiencias/${experience.id}`} className="underline underline-offset-4">
                      Editar
                    </Link>
                    <button
                      type="button"
                      className="text-neutral-500"
                      onClick={() => {
                        if (confirm("¿Eliminar esta publicación?")) {
                          deleteExperience(experience.id).then(load);
                        }
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
