type Variant = "login" | "register";

const copy = {
  login: {
    title: "Bienvenido de nuevo",
    subtitle: "Miles de experiencias están esperando por ti.",
  },
  register: {
    lines: ["Descubre", "Explora", "Crea memorias"] as const,
    subtitle: "Empieza a explorar una comunidad llena de experiencias pensadas para ti.",
  },
};

export function IllustrationPanel({
  image,
  variant,
  showBack,
  onBack,
}: {
  image: string;
  variant: Variant;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <aside className="relative hidden overflow-hidden bg-slateblue lg:block">
      <img
        src={image}
        alt=""
        className={`absolute inset-0 h-full w-full scale-110 object-cover ${
          variant === "login" ? "object-left" : "object-right"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slateblue/70 via-slateblue/25 to-transparent" />
      <div className="relative flex h-full flex-col justify-between p-10 text-white">
        {showBack ? (
          <button
            type="button"
            onClick={onBack}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/70"
            aria-label="Volver"
          >
            ←
          </button>
        ) : (
          <span />
        )}
        <div className="max-w-xs pb-8">
          {variant === "login" ? (
            <>
              <h2 className="text-3xl font-semibold leading-tight">{copy.login.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/90">{copy.login.subtitle}</p>
            </>
          ) : (
            <>
              {copy.register.lines.map((line) => (
                <p key={line} className="text-3xl font-semibold leading-tight">
                  {line}
                </p>
              ))}
              <p className="mt-4 text-sm leading-6 text-white/90">{copy.register.subtitle}</p>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
