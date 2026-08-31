function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.7S8.9 6 12 6c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c5.2 0 8.6-3.6 8.6-8.7 0-.6-.1-1-.2-1.4H12z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
      <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
      <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
      <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
    </svg>
  );
}

export function SocialButtons({ label }: { label: string }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" />
        {label}
        <span className="h-px flex-1 bg-neutral-200" />
      </div>
      <div className="flex justify-center gap-4">
        {[
          { name: "Google", icon: <GoogleIcon /> },
          {
            name: "Apple",
            icon: (
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
                <path d="M16.4 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9s-1.8-.8-3-.8c-1.5 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.3 3 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7 2-1.1 2.8-2.2c.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.6-1-2.6-3.9zM14.6 5.8c.6-.8 1.1-1.9.9-3-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.3-.5 3-1.5z" />
              </svg>
            ),
          },
          { name: "Microsoft", icon: <MicrosoftIcon /> },
        ].map((item) => (
          <button
            key={item.name}
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full border border-neutral-200"
            aria-label={item.name}
            onClick={() =>
              window.alert("Por ahora crea la cuenta con correo y contraseña. Google, Apple y Microsoft llegan después.")
            }
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}
