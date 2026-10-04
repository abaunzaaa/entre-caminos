/**
 * El esquema de /assistant/chat acepta como máximo 20 elementos en el arreglo
 * que llega al modelo. Ese arreglo incluye la instrucción de sistema y el
 * mensaje actual, así que el historial previo se queda en 18.
 * La conversación guardada no se recorta: esto solo arma una copia reciente.
 */
export const GUIDE_MODEL_MESSAGE_LIMIT = 20;
export const GUIDE_PRIOR_MESSAGE_LIMIT = 18;

export function recentGuideHistory<T extends { content: string }>(messages: T[]): T[] {
  return messages.filter((item) => item.content.trim()).slice(-GUIDE_PRIOR_MESSAGE_LIMIT);
}

export function fitGuideModelMessages<T extends { role: string }>(messages: T[]): T[] {
  if (messages.length <= GUIDE_MODEL_MESSAGE_LIMIT) {
    return messages;
  }
  const system = messages.filter((item) => item.role === "system");
  const turns = messages.filter((item) => item.role !== "system");
  const room = Math.max(0, GUIDE_MODEL_MESSAGE_LIMIT - system.length);
  return [...system, ...turns.slice(-room)];
}
