/** Accepts `email@domain` or `Display Name <email@domain>`. */
export function parseMailFrom(raw: string): { email: string; name?: string } {
  const trimmed = raw.trim();
  const angled = /^(.+?)\s*<([^>]+)>$/.exec(trimmed);
  if (angled) {
    const name = angled[1].trim().replace(/^["']|["']$/g, "");
    const email = angled[2].trim();
    return name ? { email, name } : { email };
  }
  return { email: trimmed };
}
