import { useEffect, useId, useRef, type ReactNode } from "react";
import "../../styles/terms-modal.css";

const CONTACT_EMAIL = "entrecaminos.e@gmail.com";

export type LegalDocument = "terms" | "privacy";

function MailLink() {
  return (
    <a className="terms-modal__mail" href={`mailto:${CONTACT_EMAIL}`}>
      {CONTACT_EMAIL}
    </a>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className="terms-modal__section">
      <h3 className="terms-modal__section-title">
        <span>{number}.</span> {title}
      </h3>
      {children}
    </section>
  );
}

function TermsBody() {
  return (
    <>
      <h3 className="terms-modal__doc-title">Términos y condiciones de uso</h3>
      <p>
        Al ingresar, registrarse o utilizar <strong>Entre Caminos</strong>, el usuario declara que ha leído,
        comprendido y aceptado estos Términos y Condiciones.
      </p>

      <Section number="1" title="Finalidad de la plataforma">
        <p>
          <strong>Entre Caminos</strong> es un sitio web informativo que permite descubrir planes y experiencias
          turísticas, culturales, gastronómicas, recreativas y de bienestar.
        </p>
        <p>
          La plataforma <strong>no realiza reservas</strong>, <strong>no recibe pagos</strong>,{" "}
          <strong>no vende entradas</strong> ni presta directamente las experiencias publicadas.
        </p>
      </Section>

      <Section number="2" title="Empresas aliadas">
        <p>
          Los planes son publicados en colaboración con <strong>empresas y emprendimientos aliados</strong>, quienes
          son responsables de la veracidad y actualización de la información, así como de los precios, horarios,
          disponibilidad, seguridad y prestación de sus servicios.
        </p>
        <p>
          Antes de asistir, comprar o reservar por medios externos, el usuario deberá confirmar directamente las
          condiciones con la <strong>empresa responsable</strong>.
        </p>
      </Section>

      <Section number="3" title="Uso de la plataforma">
        <p>
          El usuario deberá proporcionar información verdadera, proteger su cuenta y utilizar la plataforma de forma{" "}
          <strong>legal y respetuosa</strong>.
        </p>
        <p>
          Está prohibido publicar contenido falso u ofensivo, suplantar identidades, manipular reseñas, vulnerar la
          seguridad del sitio o utilizar sus contenidos sin autorización.
        </p>
        <p>
          Entre Caminos podrá <strong>suspender cuentas</strong> o retirar contenido que incumpla estas condiciones.
        </p>
      </Section>

      <Section number="4" title="Inteligencia artificial">
        <p>
          Las recomendaciones generadas mediante <strong>inteligencia artificial</strong> son orientativas y pueden
          contener errores o información desactualizada.
        </p>
        <p>No garantizan disponibilidad, precio, seguridad ni calidad.</p>
        <p>El usuario deberá verificar la información directamente con la empresa que ofrece la experiencia.</p>
      </Section>

      <Section number="5" title="Reseñas y contenidos">
        <p>
          Las reseñas deben ser <strong>auténticas</strong>, respetuosas y relacionadas con la experiencia evaluada.
        </p>
        <p>
          Entre Caminos podrá eliminar contenidos falsos, ofensivos, publicitarios o que vulneren derechos de
          terceros.
        </p>
        <p>
          Las opiniones publicadas pertenecen a sus autores y no representan necesariamente la posición de Entre
          Caminos.
        </p>
      </Section>

      <Section number="6" title="Responsabilidad">
        <p>
          Entre Caminos procura publicar información clara y actualizada, pero <strong>no responde</strong> por
          cambios, cancelaciones, accidentes, incumplimientos o diferencias en la información atribuibles a las
          empresas aliadas.
        </p>
        <p>
          Esta disposición no limita las responsabilidades legales de Entre Caminos ni los derechos de los
          consumidores.
        </p>
      </Section>

      <Section number="7" title="Propiedad intelectual y datos personales">
        <p>
          El nombre, logotipo, diseño y contenido propio de Entre Caminos están protegidos por las normas de{" "}
          <strong>propiedad intelectual</strong>.
        </p>
        <p>
          Los <strong>datos personales</strong> serán tratados de acuerdo con la Política de Privacidad y la
          legislación colombiana.
        </p>
        <p>Los usuarios podrán solicitar su consulta, actualización, corrección o eliminación mediante:</p>
        <p>
          <MailLink />
        </p>
      </Section>

      <Section number="8" title="Modificaciones y legislación aplicable">
        <p>Estos términos podrán actualizarse por cambios legales o funcionales.</p>
        <p>La versión vigente estará disponible en la plataforma.</p>
        <p>
          Los presentes términos se rigen por las leyes de la <strong>República de Colombia</strong>.
        </p>
        <p>Las solicitudes o reclamaciones podrán enviarse a:</p>
        <p>
          <MailLink />
        </p>
      </Section>

      <Section number="9" title="Aceptación">
        <p>Al seleccionar:</p>
        <p className="terms-modal__acceptance">He leído y acepto los Términos y Condiciones</p>
        <p>el usuario acepta estas disposiciones.</p>
        <p>
          Esta aceptación <strong>no constituye una compra, reserva o contratación</strong> de las experiencias
          anunciadas.
        </p>
      </Section>
    </>
  );
}

function PrivacyBody() {
  return (
    <>
      <h3 className="terms-modal__doc-title">Política de Tratamiento de Datos Personales</h3>
      <p>
        Al registrarse o utilizar <strong>Entre Caminos</strong>, el usuario autoriza el tratamiento de sus datos
        personales conforme a esta política y a la legislación colombiana vigente.
      </p>

      <Section number="1" title="Datos recopilados">
        <p>
          Entre Caminos podrá recopilar datos como <strong>nombre</strong>, <strong>correo electrónico</strong>,{" "}
          <strong>contraseña cifrada</strong>, preferencias, experiencias favoritas, reseñas e información
          relacionada con el uso de la plataforma.
        </p>
        <p>
          Entre Caminos <strong>no solicita información financiera</strong>, debido a que no procesa pagos ni
          reservas.
        </p>
      </Section>

      <Section number="2" title="Finalidad del tratamiento">
        <p>Los datos personales podrán utilizarse para:</p>
        <ul className="terms-modal__list">
          <li>Crear y administrar la cuenta del usuario.</li>
          <li>Permitir el acceso a las funcionalidades de la plataforma.</li>
          <li>Personalizar recomendaciones de planes y experiencias.</li>
          <li>Guardar favoritos, preferencias y reseñas.</li>
          <li>Atender consultas, solicitudes o reclamos.</li>
          <li>Enviar comunicaciones autorizadas sobre novedades y experiencias.</li>
          <li>Mejorar la seguridad y funcionamiento del sitio.</li>
          <li>Cumplir obligaciones legales.</li>
        </ul>
        <p>
          Los datos <strong>no serán utilizados para finalidades diferentes</strong> sin informar al usuario y
          solicitar su autorización cuando sea necesario.
        </p>
      </Section>

      <Section number="3" title="Derechos del usuario">
        <p>El titular de los datos podrá:</p>
        <ul className="terms-modal__list">
          <li>Conocer, consultar y actualizar su información.</li>
          <li>Solicitar la corrección de datos incorrectos.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Conocer el uso dado a sus datos.</li>
          <li>
            Revocar la autorización o solicitar la eliminación de sus datos cuando sea legalmente procedente.
          </li>
          <li>
            Presentar quejas ante la <strong>Superintendencia de Industria y Comercio</strong>.
          </li>
        </ul>
      </Section>

      <Section number="4" title="Protección de la información">
        <p>
          Entre Caminos adoptará <strong>medidas técnicas y administrativas razonables</strong> para evitar la
          pérdida, alteración, acceso no autorizado o uso indebido de los datos.
        </p>
        <p>
          La contraseña será almacenada de manera <strong>cifrada</strong>.
        </p>
        <p>El usuario también deberá proteger sus credenciales y evitar compartirlas con otras personas.</p>
      </Section>

      <Section number="5" title="Información compartida">
        <p>
          Entre Caminos <strong>no venderá</strong> los datos personales de sus usuarios.
        </p>
        <p>La información solo podrá compartirse con:</p>
        <ul className="terms-modal__list">
          <li>Proveedores tecnológicos necesarios para el funcionamiento de la plataforma.</li>
          <li>Autoridades competentes cuando exista una obligación legal.</li>
          <li>Terceros autorizados expresamente por el usuario.</li>
        </ul>
        <p>
          Las <strong>empresas aliadas</strong> no recibirán información personal del usuario sin autorización o una
          finalidad legítima previamente informada.
        </p>
      </Section>

      <Section number="6" title="Conservación y eliminación">
        <p>
          Los datos serán conservados durante el tiempo necesario para cumplir las finalidades informadas y las
          obligaciones legales aplicables.
        </p>
        <p>
          El usuario podrá solicitar la <strong>eliminación de su cuenta</strong> y de sus datos.
        </p>
        <p>
          Algunos registros podrán conservarse cuando exista una obligación legal, contractual o de seguridad.
        </p>
      </Section>

      <Section number="7" title="Cookies">
        <p>
          Entre Caminos podrá utilizar <strong>cookies</strong> y tecnologías similares para:
        </p>
        <ul className="terms-modal__list">
          <li>Recordar preferencias.</li>
          <li>Mantener la sesión activa.</li>
          <li>Conocer el funcionamiento del sitio.</li>
          <li>Mejorar la experiencia del usuario.</li>
        </ul>
        <p>
          El usuario podrá configurar o desactivar las cookies desde su navegador, aunque algunas funcionalidades
          podrían verse afectadas.
        </p>
      </Section>

      <Section number="8" title="Consultas y reclamos">
        <p>
          Para consultar, actualizar, corregir o solicitar la eliminación de sus datos, el usuario podrá comunicarse
          mediante:
        </p>
        <p>
          Correo electrónico:
          <br />
          <MailLink />
        </p>
        <p>La solicitud deberá incluir:</p>
        <ul className="terms-modal__list">
          <li>Nombre del titular.</li>
          <li>Descripción clara de la petición.</li>
          <li>Información necesaria para verificar su identidad.</li>
        </ul>
      </Section>

      <Section number="9" title="Modificaciones">
        <p>Esta política podrá actualizarse por cambios legales, técnicos o funcionales.</p>
        <p>
          La versión vigente y su <strong>fecha de actualización</strong> estarán disponibles en la plataforma.
        </p>
      </Section>

      <Section number="10" title="Autorización">
        <p>Al seleccionar:</p>
        <p className="terms-modal__acceptance">
          He leído y acepto la Política de Tratamiento de Datos Personales
        </p>
        <p>
          el usuario manifiesta que fue informado sobre las finalidades del tratamiento y sus derechos, y autoriza
          de manera <strong>previa, expresa e informada</strong> el uso de sus datos personales.
        </p>
      </Section>
    </>
  );
}

const documents: Record<
  LegalDocument,
  { kicker: string; title: string; intro: string; body: ReactNode }
> = {
  terms: {
    kicker: "Conoce nuestras condiciones de uso",
    title: "TÉRMINOS Y CONDICIONES",
    intro:
      "Al utilizar Entre Caminos aceptas nuestras condiciones de uso y las reglas que permiten ofrecer una experiencia segura para todos nuestros usuarios.",
    body: <TermsBody />,
  },
  privacy: {
    kicker: "Protegemos tu información durante cada camino",
    title: "TRATAMIENTO DE DATOS PERSONALES",
    intro:
      "Conoce cómo Entre Caminos recopila, utiliza y protege tu información personal para ofrecerte una experiencia segura y personalizada.",
    body: <PrivacyBody />,
  },
};

export function TermsModal({
  open,
  onClose,
  kind = "terms",
}: {
  open: boolean;
  onClose: () => void;
  kind?: LegalDocument;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const copy = documents[kind];

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    bodyRef.current?.scrollTo(0, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, kind]);

  if (!open) return null;

  return (
    <div className="terms-modal" role="presentation" onClick={onClose}>
      <div
        className="terms-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="terms-modal__close"
          aria-label="Cerrar"
          onClick={onClose}
        >
          ×
        </button>

        <header className="terms-modal__header">
          <p className="terms-modal__kicker">{copy.kicker}</p>
          <h2 id={titleId} className="terms-modal__title">
            {copy.title}
          </h2>
          <p className="terms-modal__intro">{copy.intro}</p>
        </header>

        <div className="terms-modal__body" ref={bodyRef}>
          {copy.body}
        </div>
      </div>
    </div>
  );
}
