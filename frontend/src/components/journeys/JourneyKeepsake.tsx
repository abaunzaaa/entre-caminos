import type { CSSProperties } from "react";
import { useInViewReveal } from "../../hooks/useInViewReveal";
import { OpenBitacoraButton } from "./OpenBitacoraButton";

export function JourneyKeepsake({ photos }: { photos: string[] }) {
  void photos;
  const { ref, inView } = useInViewReveal<HTMLDivElement>({ rootMargin: "0px", enterRatio: 0.14, leaveRatio: 0 });

  return (
    <div ref={ref} className={`caminos-keep explorer-reveal-scope${inView ? " is-revealed" : ""}`}>
      <h2 className="explorer-recs__column-title caminos-plans__title explorer-reveal explorer-reveal--title">
        Guarda tus recuerdos
      </h2>
      <p
        className="explorer-recs__column-lead caminos-plans__lead explorer-reveal explorer-reveal--soft"
        style={{ "--reveal-delay": "100ms" } as CSSProperties}
      >
        Crea tu bitácora con fotos y notas.
      </p>

      <div className="caminos-keep__scene">
        <div className="caminos-keep__frame">
          <img
            className="caminos-keep__collage"
            src="/mis-caminos/guarda-recuerdos.png"
            alt="Collage de recuerdos con sobre verde"
            width={788}
            height={977}
            decoding="async"
          />
        </div>
        <OpenBitacoraButton />
      </div>
    </div>
  );
}
