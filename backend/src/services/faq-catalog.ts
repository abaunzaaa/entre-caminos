export type FaqSeedItem = {
  seedKey: string;
  question: string;
  answer: string;
};

export type FaqSeedCategory = {
  slug: string;
  name: string;
  sortOrder: number;
  items: FaqSeedItem[];
};

/** Catálogo inicial. La carga es idempotente por slug de categoría y seedKey de cada pregunta. */
export const FAQ_SEED: FaqSeedCategory[] = [
  {
    slug: "general",
    name: "General",
    sortOrder: 1,
    items: [
      {
        seedKey: "general-que-es",
        question: "¿Qué es Entre Caminos?",
        answer:
          "Entre Caminos es una plataforma donde puedes descubrir experiencias culturales, gastronómicas, recreativas, artísticas y turísticas, explorar diferentes planes y encontrar nuevas formas de disfrutar tu tiempo.",
      },
      {
        seedKey: "general-registro",
        question: "¿Necesito registrarme para explorar las experiencias?",
        answer:
          "Puedes explorar las experiencias disponibles sin iniciar sesión. Para utilizar funciones personales, como guardar favoritos o registrar experiencias visitadas, necesitas tener una cuenta.",
      },
      {
        seedKey: "general-gratuitas",
        question: "¿Las experiencias de Entre Caminos son gratuitas?",
        answer:
          "Algunas experiencias pueden ser gratuitas y otras tener un costo. Puedes consultar el precio de cada actividad en su página de detalle, cuando esa información esté disponible.",
      },
      {
        seedKey: "general-que-puedo",
        question: "¿Qué puedo hacer en Entre Caminos?",
        answer:
          "Puedes explorar experiencias, filtrarlas por lo que buscas, guardar favoritos si tienes cuenta, organizar planes en Mis Caminos y coleccionar estampitas de las experiencias que marques como visitadas.",
      },
      {
        seedKey: "general-organiza",
        question: "¿Entre Caminos organiza directamente las experiencias?",
        answer:
          "Entre Caminos es la plataforma para descubrirlas. Los detalles de cada experiencia, como precio, horario o contacto, los publica quien la ofrece. En el detalle encuentras esa información cuando está disponible.",
      },
      {
        seedKey: "general-como-funciona",
        question: "¿Cómo funciona la plataforma?",
        answer:
          "Exploras el catálogo, abres el detalle de una experiencia y, si inicias sesión, puedes guardar favoritos, ajustar tus intereses y organizar lo que quieres vivir en Mis Caminos.",
      },
      {
        seedKey: "general-celular",
        question: "¿Puedo usar Entre Caminos desde el celular?",
        answer:
          "Sí. Puedes abrir Entre Caminos en el navegador de tu celular. La plataforma se adapta a la pantalla.",
      },
    ],
  },
  {
    slug: "experiencias",
    name: "Experiencias",
    sortOrder: 2,
    items: [
      {
        seedKey: "experiencias-encontrar",
        question: "¿Cómo puedo encontrar experiencias que me interesen?",
        answer:
          "Puedes explorar el catálogo, utilizar los filtros disponibles y consultar las experiencias recomendadas según tus intereses.",
      },
      {
        seedKey: "experiencias-ubicacion",
        question: "¿Cómo puedo conocer la ubicación de una experiencia?",
        answer:
          "En el detalle de cada experiencia puedes consultar la información de ubicación disponible y utilizar las opciones de mapa o indicaciones cuando estén habilitadas.",
      },
      {
        seedKey: "experiencias-contacto",
        question: "¿Cómo puedo contactar al organizador de una experiencia?",
        answer:
          "En el detalle de la experiencia encontrarás la información de contacto proporcionada por su organizador y, cuando exista, un enlace externo para obtener más información.",
      },
      {
        seedKey: "experiencias-favoritos",
        question: "¿Puedo guardar experiencias para verlas después?",
        answer:
          "Sí. Si has iniciado sesión, puedes agregar experiencias a tus favoritos para encontrarlas fácilmente cuando quieras volver a consultarlas.",
      },
      {
        seedKey: "experiencias-disponible",
        question: "¿Cómo sé si una experiencia está disponible?",
        answer:
          "En el detalle de la experiencia puedes ver la disponibilidad publicada: todos los días, algunos días, fechas concretas o «Próximamente». Si no aparece, esa información todavía no está cargada.",
      },
      {
        seedKey: "experiencias-precio",
        question: "¿Cómo veo el precio de una experiencia?",
        answer:
          "El precio se muestra en el detalle de la experiencia cuando quien la ofrece lo ha publicado. Si no lo ves, aún no está informado.",
      },
      {
        seedKey: "experiencias-proximamente",
        question: "¿Qué pasa si una experiencia dice «Próximamente»?",
        answer:
          "Significa que todavía no está disponible para vivirla. Puedes ver la información que ya esté publicada y volver más adelante.",
      },
      {
        seedKey: "experiencias-duracion",
        question: "¿Cómo veo cuánto dura una experiencia?",
        answer:
          "La duración aparece en el detalle cuando está registrada, en minutos, horas o días. Si no la encuentras, aún no fue publicada.",
      },
      {
        seedKey: "experiencias-horario",
        question: "¿Las experiencias tienen horario?",
        answer:
          "Algunas sí. Cuando el organizador indica días, fechas u horarios, los ves en el detalle de la experiencia.",
      },
      {
        seedKey: "experiencias-ubicaciones",
        question: "¿Puedo ver varias ubicaciones de una experiencia?",
        answer:
          "Si una experiencia tiene más de un lugar, esas ubicaciones se muestran en su detalle. Cada sede aparece cuando esa información está cargada.",
      },
      {
        seedKey: "experiencias-categoria",
        question: "¿Cómo encuentro experiencias por categoría?",
        answer:
          "En Explorar puedes usar el filtro de categoría, además de ciudad, presupuesto y tipo de plan, y también buscar por nombre.",
      },
      {
        seedKey: "experiencias-recomendadas",
        question: "¿Cómo descubro experiencias recomendadas para mí?",
        answer:
          "Si tienes cuenta e indicas tus intereses, Entre Caminos puede mostrarte experiencias elegidas a partir de esas preferencias. También puedes explorar todo el catálogo.",
      },
    ],
  },
  {
    slug: "mi-cuenta",
    name: "Mi cuenta",
    sortOrder: 3,
    items: [
      {
        seedKey: "cuenta-crear",
        question: "¿Cómo puedo crear una cuenta?",
        answer:
          "Puedes registrarte utilizando las opciones disponibles en la plataforma y completar los datos solicitados durante el proceso.",
      },
      {
        seedKey: "cuenta-preferencias",
        question: "¿Puedo modificar mis intereses y preferencias?",
        answer:
          "Sí. Desde tu perfil puedes gestionar las preferencias que estén disponibles para personalizar tu experiencia en Entre Caminos.",
      },
      {
        seedKey: "cuenta-sesion",
        question: "¿Cómo inicio sesión?",
        answer:
          "Entra en Acceder e ingresa el correo y la contraseña de tu cuenta. Si aún no tienes una, puedes registrarte desde la misma zona.",
      },
      {
        seedKey: "cuenta-google",
        question: "¿Puedo iniciar sesión con Google?",
        answer:
          "Sí. En el acceso y en el registro está la opción Continuar con Google.",
      },
      {
        seedKey: "cuenta-datos",
        question: "¿Cómo cambio mis datos personales?",
        answer:
          "Con la sesión iniciada, abre tu perfil y edita los datos que la plataforma te permita actualizar.",
      },
      {
        seedKey: "cuenta-olvido",
        question: "¿Qué hago si olvidé mi contraseña?",
        answer:
          "En Acceder elige ¿Olvidaste tu contraseña? y sigue el enlace que enviamos a tu correo para crear una nueva.",
      },
    ],
  },
  {
    slug: "mis-caminos",
    name: "Mis caminos",
    sortOrder: 6,
    items: [
      {
        seedKey: "caminos-que-es",
        question: "¿Qué es Mis Caminos?",
        answer:
          "Mis Caminos es un espacio personal donde puedes organizar tus próximos planes y llevar un registro de las experiencias que quieres disfrutar.",
      },
      {
        seedKey: "caminos-estampitas",
        question: "¿Qué son las estampitas?",
        answer:
          "Las estampitas son recuerdos digitales que coleccionas al marcar una experiencia como visitada. Puedes consultarlas desde la sección de estampitas de tu perfil.",
      },
      {
        seedKey: "caminos-conseguir",
        question: "¿Cómo consigo una estampita?",
        answer:
          "Cuando hayas realizado una experiencia, puedes marcarla como «Ya visité». Si tiene una estampita asociada, aparecerá en tu colección personal.",
      },
      {
        seedKey: "caminos-agregar",
        question: "¿Cómo agrego una experiencia a Mis Caminos?",
        answer:
          "Con la sesión iniciada, abre Mis Caminos y suma la experiencia a tus planes. Desde ahí puedes tenerla a la vista junto con lo que quieres vivir.",
      },
      {
        seedKey: "caminos-personalizar",
        question: "¿Puedo personalizar mi calendario?",
        answer:
          "Sí. En Mis Caminos puedes ajustar la presentación de tu espacio, con los fondos y stickers disponibles, para organizar tus planes a tu manera.",
      },
      {
        seedKey: "caminos-proximos",
        question: "¿Qué son los próximos planes?",
        answer:
          "Son las experiencias que dejaste listas para más adelante en Mis Caminos. Si todavía no agregas ninguna, esa sección aparece vacía.",
      },
      {
        seedKey: "caminos-organizar",
        question: "¿Cómo organizo mejor mis experiencias?",
        answer:
          "Usa favoritos para lo que quieres recordar y Mis Caminos para armar tus próximos planes. Las experiencias que marques como visitadas quedan en tu recorrido.",
      },
    ],
  },
  {
    slug: "ayuda",
    name: "Ayuda",
    sortOrder: 9,
    items: [
      {
        seedKey: "ayuda-enviar",
        question: "¿Cómo puedo enviar una pregunta que no aparece aquí?",
        answer:
          "Puedes utilizar el formulario de esta sección para enviarnos tu duda. Nuestro equipo podrá revisarla y responderla.",
      },
      {
        seedKey: "ayuda-reportar",
        question: "¿Dónde puedo reportar un problema?",
        answer:
          "Escríbenos desde Contacto o envía tu mensaje con «Hacer una pregunta» en Preguntas frecuentes. El equipo lo revisa desde el panel de administración.",
      },
      {
        seedKey: "ayuda-respuesta",
        question: "¿Cómo sé si respondieron mi pregunta?",
        answer:
          "Hoy no enviamos un aviso a tu cuenta cuando respondemos. Si el equipo decide publicarla, la respuesta aparece en Preguntas frecuentes.",
      },
      {
        seedKey: "ayuda-sugerir",
        question: "¿Puedo sugerir una nueva pregunta frecuente?",
        answer:
          "Sí. Usa «Hacer una pregunta» y cuéntanos qué te gustaría ver aquí. El equipo la revisa antes de publicarla.",
      },
    ],
  },
  {
    slug: "favoritos",
    name: "Favoritos",
    sortOrder: 4,
    items: [
      {
        seedKey: "favoritos-como",
        question: "¿Cómo guardo una experiencia en favoritos?",
        answer:
          "Inicia sesión, abre la experiencia y márcala como favorita. Sin cuenta puedes explorarla, pero no guardarla.",
      },
      {
        seedKey: "favoritos-donde",
        question: "¿Dónde encuentro mis favoritos?",
        answer:
          "Entra a Favoritos desde el menú del explorador. Ahí están las experiencias que guardaste.",
      },
      {
        seedKey: "favoritos-quitar",
        question: "¿Puedo quitar una experiencia de favoritos?",
        answer:
          "Sí. Vuelve a usar la acción de favoritos en la experiencia o quítala desde tu lista de Favoritos.",
      },
    ],
  },
  {
    slug: "estampitas",
    name: "Estampitas",
    sortOrder: 5,
    items: [
      {
        seedKey: "estampitas-no-aparece",
        question: "¿Por qué una experiencia visitada no muestra estampita?",
        answer:
          "Marcar «Ya visité» registra la visita. La estampita solo aparece si esa experiencia tiene una asociada. Si no la tiene, la visita queda sin estampita.",
      },
      {
        seedKey: "estampitas-coleccion",
        question: "¿Dónde veo mi colección de estampitas?",
        answer:
          "Con la sesión iniciada, abre la sección de estampitas de tu perfil. Ahí está la colección de las que ya desbloqueaste.",
      },
      {
        seedKey: "estampitas-detalle",
        question: "¿Puedo ver la información de la experiencia desde una estampita?",
        answer:
          "La estampita corresponde a una experiencia del catálogo. Desde tu colección puedes identificarla y abrir su detalle cuando ese enlace está disponible.",
      },
    ],
  },
  {
    slug: "plan-con-amigos",
    name: "Plan con amigos",
    sortOrder: 7,
    items: [
      {
        seedKey: "amigos-que-es",
        question: "¿Qué es Plan con amigos?",
        answer:
          "Es una sección del explorador pensada para planear en grupo. La herramienta todavía está en preparación. Mientras tanto puedes guardar favoritos y organizar tus planes en Mis Caminos.",
      },
      {
        seedKey: "amigos-compatibilidad",
        question: "¿Cómo funciona la compatibilidad grupal?",
        answer:
          "Todavía no hay una comparación automática de gustos entre varias personas. Las recomendaciones actuales se arman con los intereses de tu propia cuenta.",
      },
      {
        seedKey: "amigos-comparar",
        question: "¿Puedo comparar gustos con otras personas?",
        answer:
          "Esa comparación aún no está disponible. Puedes revisar tus intereses en el perfil y explorar las experiencias recomendadas para ti.",
      },
      {
        seedKey: "amigos-que-toma",
        question: "¿Qué toma en cuenta la compatibilidad?",
        answer:
          "Hoy no hay un cálculo de compatibilidad entre cuentas. Lo que sí usa Entre Caminos son los intereses que guardas en tu perfil para sugerirte experiencias.",
      },
    ],
  },
  {
    slug: "mapa",
    name: "Mapa",
    sortOrder: 8,
    items: [
      {
        seedKey: "mapa-como",
        question: "¿Cómo funciona el mapa?",
        answer:
          "El mapa interactivo del explorador todavía no está listo. Mientras tanto, la ubicación se consulta en el detalle de cada experiencia.",
      },
      {
        seedKey: "mapa-sin-mapa",
        question: "¿Qué hago si una experiencia no muestra mapa?",
        answer:
          "Revisa el texto de ubicación en su detalle. Si no hay mapa ni dirección, esa información aún no fue publicada.",
      },
      {
        seedKey: "mapa-ubicacion",
        question: "¿Puedo buscar experiencias por ubicación?",
        answer:
          "Sí. En Explorar puedes filtrar por ciudad y usar el buscador. La ubicación concreta de cada plan está en su detalle.",
      },
      {
        seedKey: "mapa-llegar",
        question: "¿Cómo llego a una experiencia?",
        answer:
          "Abre el detalle de la experiencia. Si hay indicaciones o un enlace de mapa, los encuentras ahí. Si no aparecen, la ruta todavía no está disponible.",
      },
    ],
  },
];

export function faqCategorySlug(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "categoria";
}
