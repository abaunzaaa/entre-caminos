import { AuthKeyIcon } from "../auth/AuthKeyIcon";

const LOADING_LABEL =
  "Estamos trazando tu próximo camino. Explorando experiencias, combinando tus gustos y diseñando una propuesta personalizada.";

type PlannerLoadingProps = {
  error: string;
  empty: boolean;
  onRetry: () => void;
  onBack: () => void;
};

export function PlannerLoading({ error, empty, onRetry, onBack }: PlannerLoadingProps) {
  if (error) {
    return (
      <div className="favorite-save-modal plan-failure" role="dialog" aria-modal="true" aria-labelledby="plan-failure-title">
        <div className="favorite-save-modal__backdrop" />
        <div className="favorite-save-modal__panel">
          <AuthKeyIcon />
          <header className="favorite-save-modal__head">
            <h2 id="plan-failure-title" className="favorite-save-modal__title">
              {empty ? "No encontramos un camino con estas preferencias" : "No pudimos trazar tu camino"}
            </h2>
          </header>
          <p>
            {empty
              ? error
              : "Esta vez no logramos crear tu itinerario. Puedes intentarlo de nuevo o ajustar tus preferencias."}
          </p>
          <div className="favorite-save-modal__actions">
            {empty ? null : (
              <button type="button" className="favorite-save-modal__primary" onClick={onRetry}>Reintentar</button>
            )}
            <button type="button" className={empty ? "favorite-save-modal__primary" : "favorite-save-modal__ghost"} onClick={onBack}>
              Editar preferencias
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="planner-loading" role="status" aria-live="polite" aria-busy="true">
      <img className="planner-loading__art" src="/planner/cargando-camino.png" alt={LOADING_LABEL} />
    </section>
  );
}
