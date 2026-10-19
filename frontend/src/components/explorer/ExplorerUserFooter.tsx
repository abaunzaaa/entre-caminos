import type { CSSProperties } from "react";
import footerUser from "../../assets/footer-user.png";
import brandLogo from "../../assets/logo.png";
import palomaLeft from "../../assets/paloma1.png";
import palomaRight from "../../assets/paloma 2.png";
import { useInViewReveal } from "../../hooks/useInViewReveal";

export function ExplorerUserFooter({ once = false, birds = false }: { once?: boolean; birds?: boolean }) {
  const { ref, inView } = useInViewReveal<HTMLElement>({ once });

  return (
    <div
      ref={ref}
      className={`explorer-user-footer-wrap explorer-reveal-scope${inView ? " is-revealed" : ""}`}
    >
      {birds ? (
        <>
          <img
            className="explorer-user-footer__dove explorer-user-footer__dove--left explorer-reveal explorer-reveal--soft"
            src={palomaLeft}
            alt=""
            aria-hidden="true"
            decoding="async"
            style={{ "--reveal-delay": "80ms" } as CSSProperties}
          />
          <img
            className="explorer-user-footer__dove explorer-user-footer__dove--right explorer-reveal explorer-reveal--soft"
            src={palomaRight}
            alt=""
            aria-hidden="true"
            decoding="async"
            style={{ "--reveal-delay": "160ms" } as CSSProperties}
          />
        </>
      ) : null}
      <footer className="explorer-user-footer" aria-labelledby="explorer-stories-title">
        <img
          className="explorer-user-footer__image"
          src={footerUser}
          alt=""
          decoding="async"
        />
        <div className="explorer-user-footer__content">
          <div className="explorer-user-footer__cluster">
            <img
              className="explorer-user-footer__logo explorer-reveal explorer-reveal--soft"
              src={brandLogo}
              alt="Entre caminos"
              width={80}
              decoding="async"
              style={{ "--reveal-delay": "40ms" } as CSSProperties}
            />
            <h2
              className="explorer-discover-title explorer-reveal explorer-reveal--title"
              id="explorer-stories-title"
              style={{ "--reveal-delay": "100ms" } as CSSProperties}
            >
              Entre caminos, nacen historias
            </h2>
            <p
              className="explorer-section__lead explorer-reveal explorer-reveal--soft"
              style={{ "--reveal-delay": "170ms" } as CSSProperties}
            >
              Elige un lugar, sal de la rutina y vive una nueva experiencia.
            </p>
          </div>
        </div>
        <a
          className="explorer-user-footer__rates"
          href="https://www.exchangerate-api.com"
          target="_blank"
          rel="noreferrer"
        >
          Rates by ExchangeRate-API
        </a>
      </footer>
    </div>
  );
}
