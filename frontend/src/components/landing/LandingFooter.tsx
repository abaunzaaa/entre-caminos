import { useState } from "react";
import logoEntreCaminos from "../../assets/logo.png";
import { ContactModal } from "../contact/ContactModal";
import { HowItWorksModal } from "../how-it-works/HowItWorksModal";
import { TermsModal } from "../legal/TermsModal";
import "../../styles/landing-footer.css";

type LandingFooterProps = {
  variant?: "public" | "compact";
};

export function LandingFooter({ variant = "public" }: LandingFooterProps) {
  const [contactOpen, setContactOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [legalDocument, setLegalDocument] = useState<"terms" | "privacy" | null>(null);
  const compact = variant === "compact";

  return (
    <>
      <footer
        id={compact ? undefined : "contacto"}
        className={`landing-footer${compact ? " landing-footer--compact" : ""}`}
      >
        <div className="landing-footer__crest">
          <img src={logoEntreCaminos} alt="Entre Caminos" className="landing-footer__logo" />
        </div>
        <div className="landing-footer__inner">
          {compact ? null : (
            <div className="landing-footer__columns">
              <div className="landing-footer__col landing-footer__col--left">
                <h3 className="landing-footer__col-title">ACERCA DE</h3>
                <ul className="landing-footer__links">
                  <li>
                    <a
                      href="#como-funciona"
                      onClick={(event) => {
                        event.preventDefault();
                        setHowItWorksOpen(true);
                      }}
                    >
                      Cómo funciona
                    </a>
                  </li>
                  <li>
                    <a
                      href="#contacto"
                      onClick={(event) => {
                        event.preventDefault();
                        setContactOpen(true);
                      }}
                    >
                      Contacto
                    </a>
                  </li>
                </ul>
              </div>
              <div className="landing-footer__col landing-footer__col--right">
                <h3 className="landing-footer__col-title">LEGAL</h3>
                <ul className="landing-footer__links">
                  <li>
                    <a
                      href="#contacto"
                      onClick={(event) => {
                        event.preventDefault();
                        setLegalDocument("terms");
                      }}
                    >
                      Términos y condiciones
                    </a>
                  </li>
                  <li>
                    <a
                      href="#contacto"
                      onClick={(event) => {
                        event.preventDefault();
                        setLegalDocument("privacy");
                      }}
                    >
                      Tratamiento de datos personales
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          )}
          <p className="landing-footer__copy">© 2026 Entre Caminos. Todos los derechos reservados.</p>
        </div>
      </footer>
      {compact ? null : (
        <>
          <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
          <HowItWorksModal open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
          <TermsModal
            open={legalDocument !== null}
            kind={legalDocument ?? "terms"}
            onClose={() => setLegalDocument(null)}
          />
        </>
      )}
    </>
  );
}
