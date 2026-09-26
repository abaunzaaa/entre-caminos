export function formatPersonName(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) {
            return part;
          }
          const lower = part.toLocaleLowerCase("es-CO");
          return lower.charAt(0).toLocaleUpperCase("es-CO") + lower.slice(1);
        })
        .join("-"),
    )
    .join(" ");
}
