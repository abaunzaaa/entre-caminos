export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs uppercase tracking-[0.2em] text-forest/60">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-700">{error}</span>}
    </label>
  );
}
