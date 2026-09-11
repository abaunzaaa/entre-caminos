const RULES = [
  { id: "length", label: "8+", test: (value: string) => value.length >= 8 },
  { id: "upper", label: "A-Z", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lower", label: "a-z", test: (value: string) => /[a-z]/.test(value) },
  { id: "number", label: "123", test: (value: string) => /[0-9]/.test(value) },
  { id: "symbol", label: "#", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function PasswordRequirements({ value }: { value: string }) {
  return (
    <ul className="auth-reqs" aria-label="Requisitos de contraseña">
      {RULES.map((rule) => (
        <li key={rule.id} className={rule.test(value) ? "is-met" : undefined}>
          <span className="auth-reqs__mark" aria-hidden="true" />
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
