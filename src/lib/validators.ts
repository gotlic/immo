// ── Email ─────────────────────────────────────────────────────────────────────
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

// ── Téléphone français ────────────────────────────────────────────────────────
// Accepte : 06 12 34 56 78 / 0612345678 / +33612345678 / 0033612345678
// Séparateurs autorisés : espace, point, tiret
export function isValidPhoneFR(phone: string): boolean {
  const cleaned = phone.replace(/[\s.\-()]/g, "");
  return (
    /^0[1-9]\d{8}$/.test(cleaned) ||           // 0X XXXXXXXX
    /^\+33[1-9]\d{8}$/.test(cleaned) ||         // +33X XXXXXXXX
    /^0033[1-9]\d{8}$/.test(cleaned)            // 0033X XXXXXXXX
  );
}

export function phoneErrorMessage(phone: string): string | null {
  if (!phone.trim()) return "Téléphone requis";
  if (!isValidPhoneFR(phone)) return "Format invalide — ex. 06 12 34 56 78 ou +33 6 12 34 56 78";
  return null;
}

export function emailErrorMessage(email: string): string | null {
  if (!email.trim()) return "Email requis";
  if (!isValidEmail(email)) return "Format invalide — ex. prenom@email.fr";
  return null;
}
