export function Spinner() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-forest/20 border-t-forest"
        role="status"
        aria-label="Cargando"
      />
    </div>
  );
}
