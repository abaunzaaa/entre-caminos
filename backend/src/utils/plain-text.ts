const TAGS = /<[^>]*>/g;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

/** Texto de una línea: sin HTML y sin espacios sobrantes. */
export function sanitizePlainText(value: string) {
  return value.replace(TAGS, "").replace(CONTROL, "").replace(/\s+/g, " ").trim();
}

/** Texto con saltos de línea conservados, sin HTML ni bloques vacíos. */
export function sanitizeMultiline(value: string) {
  return value
    .replace(TAGS, "")
    .replace(CONTROL, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
