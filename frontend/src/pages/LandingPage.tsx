import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import encabezado from "../assets/encabezado.png";
import keyIcon from "../assets/key-icon.png";
import tituloEncabezado from "../assets/titulo-encabezado.png";
import logoEntreCaminos from "../assets/logo.png";
import bicicletaExp from "../assets/bicicleta-exp.jpg";
import soloMuseoExp from "../assets/solomuseo-esp.jpg";
import museoExp from "../assets/museo-exp.jpg";
import pinturaExp from "../assets/pintura-exp.jpg";
import pilatesExp from "../assets/pilates-exp.jpg";
import meditacionExp from "../assets/meditacion-exp.jpg";
import meditacion2Exp from "../assets/meditacion2-exp.jpg";
import expDestacada from "../assets/exp-destacada.png";
import ceramicaExpd from "../assets/ceramica-expd.jpg";
import castilloExpd from "../assets/castillo-expd.jpg";
import pilatesExpd from "../assets/pilates-expd.jpg";
import pinturaExpd from "../assets/pintura-expd.jpg";
import floresExpd from "../assets/flores-expd.jpg";
import boteroExpd from "../assets/botero-expd.jpg";
import cafetourExpd from "../assets/cafetour-expd.jpg";
import billarExp from "../assets/billar-exp.jpg";
import carroExp from "../assets/carro-exp.jpg";
import padelExp from "../assets/padel-exp.jpg";
import golfExp from "../assets/golf-exp.jpg";
import { ContactModal } from "../components/contact/ContactModal";
import "../styles/landing-hero.css";
import "../styles/landing-intro.css";
import "../styles/landing-featured.css";
import "../styles/landing-values.css";
import "../styles/landing-footer.css";

const featuredShowcase = [
  {
    image: ceramicaExpd,
    title: "Crea tu propia pieza: Cerámicas El Dorado",
    description:
      "Vive una experiencia artesanal en El Carmen de Viboral, conoce la tradición cerámica antioqueña y crea tu propia pieza junto a artesanos locales.",
    place: "Cerámicas El Dorado — El Carmen de Viboral, Antioquia",
    price: "Desde $75.000 COP",
    available: "Reservas programadas",
    duration: "2 horas aproximadamente",
  },
  {
    image: castilloExpd,
    title: "Historia y encanto: Museo El Castillo",
    description:
      "Recorre uno de los lugares más emblemáticos de Medellín, descubre su arquitectura europea, jardines y colecciones de arte mientras conoces una parte de la historia de la ciudad.",
    place: "Museo El Castillo — Medellín, Antioquia",
    price: "Desde $12.000 COP aproximadamente",
    available: "Martes a domingo",
    duration: "2 a 3 horas",
  },
  {
    image: pilatesExpd,
    title: "Equilibrio y bienestar: Pilates",
    description:
      "Conecta cuerpo y mente mediante una experiencia de movimiento consciente, fortalecimiento y relajación en espacios especializados de Medellín.",
    place: "Estudios de Pilates en Medellín, Antioquia",
    price: "Desde $80.000 COP por clase aproximadamente",
    available: "Lunes a sábado",
    duration: "50 a 60 minutos",
  },
  {
    image: pinturaExpd,
    title: "Pinta una historia: Taller artístico",
    description:
      "Explora tu creatividad en un espacio artístico donde puedes pintar, experimentar y crear una obra propia mientras disfrutas un momento diferente.",
    place: "Talleres artísticos en Medellín, Antioquia",
    price: "Desde $80.000 - $140.000 COP según experiencia",
    available: "Fechas programadas",
    duration: "2 horas aproximadamente",
  },
  {
    image: floresExpd,
    title: "Entre flores y naturaleza: Taller floral",
    description:
      "Aprende técnicas florales y crea composiciones únicas en una experiencia rodeada de color, naturaleza y creatividad.",
    place: "Medellín, Antioquia",
    price: "Desde $80.000 COP aproximadamente",
    available: "Reservas programadas",
    duration: "2 horas aproximadamente",
  },
  {
    image: boteroExpd,
    title: "Ruta de arte con Botero",
    description:
      "Descubre el legado de Fernando Botero recorriendo espacios culturales donde el arte, la historia y la identidad de Medellín se encuentran.",
    place: "Plaza Botero y Museo de Antioquia — Medellín",
    price: "Gratis / ingreso al museo según recorrido",
    available: "Todos los días (según espacios culturales)",
  },
  {
    image: cafetourExpd,
    title: "Ruta del café antioqueño",
    description:
      "Conoce el origen del café antioqueño visitando fincas cafeteras, aprendiendo su proceso y disfrutando una experiencia de tradición y sabor.",
    place: "Oriente Antioqueño / Antioquia",
    price: "Desde $80.000 - $150.000 COP según finca y plan",
    available: "Lunes a sábado",
    duration: "3 a 5 horas",
  },
  {
    image: billarExp,
    title: "Billar: Una experiencia para compartir",
    description:
      "Disfruta una partida de billar en espacios de entretenimiento de Medellín, ideal para compartir con amigos, competir y pasar un momento diferente.",
    place: "Clubes y salas de billar en Medellín",
    price: "Desde $20.000 COP aproximadamente por persona",
    available: "Todos los días",
    duration: "1 a 2 horas",
  },
  {
    image: carroExp,
    title: "Diversión y adrenalina: Parque de experiencias",
    description:
      "Disfruta un día lleno de emoción con atracciones, actividades recreativas y espacios para compartir con amigos o familia en parques de entretenimiento de Antioquia.",
    place: "Antioquia",
    price: "Desde $30.000 COP aproximadamente (según parque y actividades)",
    available: "Fines de semana, festivos y fechas programadas",
    duration: "Medio día o día completo",
  },
  {
    image: padelExp,
    title: "Pádel: Deporte y conexión",
    description:
      "Disfruta un deporte dinámico que combina diversión, ejercicio y conexión con otras personas en canchas especializadas de Medellín.",
    place: "Clubes deportivos de pádel — Medellín, Antioquia",
    price: "Desde $25.000 COP por persona aproximadamente",
    available: "Lunes a domingo según cancha",
    duration: "1 hora aproximadamente",
  },
  {
    image: golfExp,
    title: "Golf: Una experiencia tranquila y exclusiva",
    description:
      "Vive una experiencia deportiva rodeada de naturaleza, concentración y tranquilidad en escenarios de golf de Antioquia.",
    place: "Clubes de golf en Antioquia",
    price: "Desde $70.000 COP aproximadamente",
    available: "Reservas programadas",
    duration: "2 a 4 horas",
  },
];

function ValueIconPath() {
  return (
    <svg className="landing-values__icon" viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M8 38c5-1.5 8.5-9.5 14-12.5 5.5-3 8 5.5 14 3.5 4-1.2 7.2-6.2 9.5-11.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M9.5 40.5c4.5-1 8-8.5 13-11.2"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M37.2 9.2 38.4 12l2.9.3-2.2 1.9.7 2.8-2.6-1.5-2.6 1.5.7-2.8-2.2-1.9 2.9-.3z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ValueIconCompass() {
  return (
    <svg className="landing-values__icon" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="14.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M24 6.5v5.5M24 36v5.5M6.5 24h5.5M36 24h5.5" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      <path d="M24 13.5 27.4 24 24 34.5 20.6 24z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="1.6" stroke="currentColor" strokeWidth="1.15" />
    </svg>
  );
}

function ValueIconConnection() {
  return (
    <svg className="landing-values__icon" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="16.5" cy="14.5" r="4.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8.8 33.5c.8-7 3.8-10.6 7.7-10.6 3.9 0 6.9 3.6 7.7 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="31.5" cy="14.5" r="4.2" stroke="currentColor" strokeWidth="1.2" />
      <path d="M23.8 33.5c.8-7 3.8-10.6 7.7-10.6 3.9 0 6.9 3.6 7.7 10.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M20 22.5c2.4 2.2 5.6 2.2 8 0" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
    </svg>
  );
}

function ValueIconExplore() {
  return (
    <svg className="landing-values__icon" viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="26.5" cy="12.2" r="3.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M26.5 16.4v8.2l-5.4 11.4M26.5 24.6l6.2 2.6 2.6 9M20.4 22.8h10.4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 40c7.5-3.2 12.5-8 19.5-8S38.5 37 43 40" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

const landingValues = [
  {
    title: "Caminos con historia",
    description:
      "Descubre experiencias con identidad, lugares que tienen una historia detrás y momentos que te permiten conectar con la cultura, la ciudad y nuevas formas de vivir cada camino.",
    icon: <ValueIconPath />,
  },
  {
    title: "Experiencias seleccionadas",
    description:
      "Encuentra planes pensados para cada momento. Con nuestro asistente de inteligencia artificial descubre experiencias personalizadas según tus gustos, tu tiempo, tu presupuesto y la forma en que quieres disfrutar la ciudad.",
    icon: <ValueIconCompass />,
  },
  {
    title: "Conexiones reales",
    description:
      "Conoce opiniones reales que inspiran nuevos caminos. Además, crea planes junto a tus amigos y encuentra con ayuda de la inteligencia artificial experiencias que se adapten a todos.",
    icon: <ValueIconConnection />,
  },
  {
    title: "Nuevas formas de explorar",
    description:
      "Explora la ciudad más allá de lo común. Descubre lugares, actividades y experiencias únicas que convierten cada salida en un recuerdo especial.",
    icon: <ValueIconExplore />,
  },
];

function featuredOffset(index: number, active: number, count: number) {
  let offset = index - active;
  const half = Math.floor(count / 2);
  if (offset > half) offset -= count;
  if (offset < -half) offset += count;
  return offset;
}

export function LandingPage() {
  const { user, isAdmin } = useAuth();
  const introRef = useRef<HTMLElement>(null);
  const featuredRef = useRef<HTMLElement>(null);
  const valuesRef = useRef<HTMLElement>(null);
  const featuredPointerX = useRef(0);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);
  const [activeFeatured, setActiveFeatured] = useState(0);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    const section = introRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        section.classList.add("is-inview");
        observer.disconnect();
      },
      { threshold: 0.12 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = featuredRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        section.classList.add("is-inview");
        observer.disconnect();
      },
      { threshold: 0.18 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const section = valuesRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        section.classList.add("is-inview");
        observer.disconnect();
      },
      { threshold: 0.16 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const goFeatured = (direction: number) => {
    setFlippedCard(null);
    setActiveFeatured((current) => {
      const count = featuredShowcase.length;
      return (current + direction + count) % count;
    });
  };

  return (
    <div className="bg-white text-black">
      <section
        className="landing-hero"
        style={{ backgroundImage: `url(${encabezado})` }}
        aria-label="Encabezado"
      >
        <nav className="landing-hero__nav" aria-label="Principal">
          <div className="landing-hero__links landing-hero__links--left">
            <Link to="/">INICIO</Link>
            <a href="#como-funciona">DETALLES</a>
          </div>
          <Link to="/" className="landing-hero__mark" aria-label="Entre Caminos">
            <img src={keyIcon} alt="" className="landing-hero__key" />
          </Link>
          <div className="landing-hero__links landing-hero__links--right">
            {user ? (
              <Link to={isAdmin ? "/admin" : "/explorar"}>{isAdmin ? "Panel" : user.name}</Link>
            ) : (
              <>
                <Link to="/login">INICIAR SESIÓN</Link>
                <Link to="/register">CREAR CUENTA</Link>
              </>
            )}
          </div>
        </nav>
        <h1 className="landing-hero__title">
          <img src={tituloEncabezado} alt="Entre Caminos" className="landing-hero__wordmark" />
        </h1>
      </section>

      <section id="como-funciona" ref={introRef} className="landing-intro">
        <div className="landing-intro__stage">
          <img src={bicicletaExp} alt="" className="landing-intro__photo landing-intro__photo--bike" />
          <img src={pilatesExp} alt="" className="landing-intro__photo landing-intro__photo--pilates" />
          <img src={soloMuseoExp} alt="" className="landing-intro__photo landing-intro__photo--solo" />
          <img src={meditacionExp} alt="" className="landing-intro__photo landing-intro__photo--forest" />
          <img src={meditacion2Exp} alt="" className="landing-intro__photo landing-intro__photo--sky" />
          <img src={museoExp} alt="" className="landing-intro__photo landing-intro__photo--museum" />
          <img src={pinturaExp} alt="" className="landing-intro__photo landing-intro__photo--paint" />
          <div className="landing-intro__copy">
            <p className="landing-intro__kicker">Entre caminos que conectan momentos, personas y experiencias</p>
            <h2 className="landing-intro__title">
              <span className="landing-intro__title-line">UN CAMINO HACIA</span>
              <span className="landing-intro__title-line">NUEVAS EXPERIENCIAS</span>
            </h2>
            <p className="landing-intro__body">
              Entre Caminos nace para ayudarte a descubrir la ciudad de una forma diferente. Explora experiencias
              culturales, recreativas y turísticas seleccionadas según tus gustos, tu tiempo y la forma en que quieres
              vivir cada momento.
            </p>
            <a href="#experiencias-destacadas" className="landing-intro__cta">
              Ver experiencias destacadas
            </a>
          </div>
        </div>
      </section>

      <section id="experiencias-destacadas" ref={featuredRef} className="landing-featured">
        <div
          className="landing-featured__bg"
          style={{ backgroundImage: `url(${expDestacada})` }}
          aria-hidden="true"
        />
        <div className="landing-featured__veil" aria-hidden="true" />
        <div className="landing-featured__copy">
          <h2 className="landing-featured__title">Experiencias destacadas</h2>
        </div>
        <div
          className="landing-featured__carousel"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goFeatured(1);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goFeatured(-1);
            }
          }}
          onPointerDown={(event) => {
            featuredPointerX.current = event.clientX;
          }}
          onPointerUp={(event) => {
            const delta = event.clientX - featuredPointerX.current;
            if (delta > 56) goFeatured(-1);
            if (delta < -56) goFeatured(1);
          }}
        >
          <button
            type="button"
            className="landing-featured__nav landing-featured__nav--prev"
            aria-label="Ver experiencias anteriores"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={() => goFeatured(-1)}
          >
            ‹
          </button>
          <div className="landing-featured__stage">
            {featuredShowcase.map((item, index) => {
              const offset = featuredOffset(index, activeFeatured, featuredShowcase.length);
              const isActive = offset === 0;
              return (
                <article
                  key={item.title}
                  data-offset={offset}
                  className={`landing-featured__card${isActive ? " is-active" : ""}${
                    flippedCard === index ? " is-flipped" : ""
                  }`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => {
                    if (!isActive) {
                      setActiveFeatured(index);
                      setFlippedCard(null);
                      return;
                    }
                    if (window.matchMedia("(hover: hover)").matches) return;
                    setFlippedCard((current) => (current === index ? null : index));
                  }}
                  onKeyDown={(event) => {
                    if (!isActive) return;
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setFlippedCard((current) => (current === index ? null : index));
                  }}
                >
                  <div className="landing-featured__card-inner">
                    <div className="landing-featured__face landing-featured__face--front">
                      <img src={item.image} alt={item.title} />
                    </div>
                    <div className="landing-featured__face landing-featured__face--back">
                      <h3 className="landing-featured__card-title">{item.title}</h3>
                      <p className="landing-featured__card-desc">{item.description}</p>
                      <div className="landing-featured__meta">
                        <p>
                          <span>Lugar</span>
                          {item.place}
                        </p>
                        <p>
                          <span>Precio</span>
                          {item.price}
                        </p>
                        <p>
                          <span>Disponible</span>
                          {item.available}
                        </p>
                        {item.duration ? (
                          <p>
                            <span>Duración</span>
                            {item.duration}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            className="landing-featured__nav landing-featured__nav--next"
            aria-label="Ver más experiencias"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={() => goFeatured(1)}
          >
            ›
          </button>
        </div>
      </section>

      <section ref={valuesRef} className="landing-values" aria-label="Valores de Entre Caminos">
        <div className="landing-values__row">
          {landingValues.map((item) => (
            <article key={item.title} className="landing-values__item">
              {item.icon}
              <h3 className="landing-values__title">{item.title}</h3>
              <p className="landing-values__desc">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer id="contacto" className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__main">
            <div className="landing-footer__brand">
              <img src={logoEntreCaminos} alt="Entre Caminos" className="landing-footer__logo" />
            </div>

            <div className="landing-footer__content">
              <div className="landing-footer__columns">
                <div>
                  <h3 className="landing-footer__col-title">Entre Caminos</h3>
                  <ul className="landing-footer__links">
                    <li>
                      <a href="#como-funciona">Cómo funciona</a>
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
                <div>
                  <h3 className="landing-footer__col-title">Legal</h3>
                  <ul className="landing-footer__links">
                    <li>
                      <a href="#contacto">Términos y condiciones</a>
                    </li>
                    <li>
                      <a href="#contacto">Tratamiento de datos personales</a>
                    </li>
                  </ul>
                </div>
              </div>
              <p className="landing-footer__copy">© 2026 Entre Caminos. Todos los derechos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}
