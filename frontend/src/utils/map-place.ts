export const CURRENT_PLACE_FALLBACK = "Ubicación actual";

export function formatCurrentPlace(
  match: { municipality?: string | null; department?: string | null } | null | undefined,
) {
  const municipality = match?.municipality?.trim() ?? "";
  const department = match?.department?.trim() ?? "";
  if (municipality && department) {
    return `${municipality} · ${department}`;
  }
  if (municipality) {
    return municipality;
  }
  return CURRENT_PLACE_FALLBACK;
}
