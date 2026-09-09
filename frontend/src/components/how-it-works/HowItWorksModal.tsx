import { useEffect, useId, useRef } from "react";
import { Bookmark, Compass, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import comoFuncionaImg from "../../assets/como-funciona.png";
import "../../styles/how-it-works-modal.css";

const steps = [
  {
    number: "01",
    title: "Explora y descubre experiencias",
    lead: "Encuentra el plan ideal para cada momento",
    description:
      "Explora experiencias culturales, gastronómicas, naturales y de entretenimiento. Consulta detalles como ubicación, precio y características para encontrar lugares únicos que se adapten a lo que buscas.",
    icon: <Compass strokeWidth={1.4} />,
  },
  {
    number: "02",
    title: "Personaliza tu camino",
    lead: "Cuéntanos qué te gusta",
    description:
      "Selecciona tus intereses y preferencias para que Entre Caminos pueda mostrarte experiencias más relacionadas con tus gustos, tiempo disponible y estilo.",
    icon: <SlidersHorizontal strokeWidth={1.4} />,
  },
  {
    number: "03",
    title: "Recibe recomendaciones",
    lead: "Planes pensados para ti",
    description:
      "Nuestra inteligencia artificial analiza tus preferencias para recomendarte experiencias que se adapten a tus intereses y ayudarte a descubrir nuevos caminos.",
    icon: <Sparkles strokeWidth={1.4} />,
  },
  {
    number: "04",
    title: "Planea nuevas aventuras",
    lead: "Organiza experiencias solo o acompañado",
    description:
      "Crea planes, comparte momentos con otras personas y encuentra experiencias ideales para disfrutar según cada ocasión.",
    icon: <Users strokeWidth={1.4} />,
  },
  {
    number: "05",
    title: "Guarda tus recuerdos",
    lead: "Construye tu propio camino",
    description:
      "Guarda tus experiencias favoritas, organiza tus planes y crea un historial de los lugares y momentos que has descubierto.",
    icon: <Bookmark strokeWidth={1.4} />,
  },
];

export function HowItWorksModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const timelineRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const root = timelineRef.current;
    if (!root) return;

    const items = root.querySelectorAll(".how-it-works-modal__step");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { root, threshold: 0.28, rootMargin: "0px 0px -10% 0px" },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [open]);

  if (!open) return null;

  return (
    <div className="how-it-works-modal" role="presentation" onClick={onClose}>
      <div
        className="how-it-works-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="how-it-works-modal__close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>

        <div className="how-it-works-modal__pane">
          <p className="how-it-works-modal__kicker">Descubre una nueva forma de explorar</p>
          <h2 id={titleId} className="how-it-works-modal__title">
            ¿CÓMO FUNCIONA?
          </h2>

          <ol className="how-it-works-modal__timeline" ref={timelineRef}>
            {steps.map((step, index) => (
              <li key={step.number} className="how-it-works-modal__step">
                <div className="how-it-works-modal__rail" aria-hidden="true">
                  <span className="how-it-works-modal__node">{step.icon}</span>
                  {index < steps.length - 1 ? <span className="how-it-works-modal__line" /> : null}
                </div>
                <div className="how-it-works-modal__copy">
                  <h3 className="how-it-works-modal__heading">
                    <span className="how-it-works-modal__number">{step.number}</span>
                    {step.title}
                  </h3>
                  <p className="how-it-works-modal__lead">{step.lead}</p>
                  <p className="how-it-works-modal__desc">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="how-it-works-modal__visual" aria-hidden="true">
          <img src={comoFuncionaImg} alt="" />
        </aside>
      </div>
    </div>
  );
}
