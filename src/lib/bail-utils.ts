// ── Chiffres en toutes lettres (français) ─────────────────────────────────────
const UNITS = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
const TENS = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) return u === 1 ? "soixante-et-onze" : `soixante-${UNITS[10 + u]}`;
  if (t === 9) return `quatre-vingt-${u === 0 ? "s" : UNITS[u]}`.replace("-s", "s");
  if (u === 0) return TENS[t] + (t === 8 ? "s" : "");
  if (u === 1 && t !== 8) return `${TENS[t]}-et-${UNITS[u]}`;
  return `${TENS[t]}-${UNITS[u]}`;
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const centStr = h === 1 ? "cent" : `${UNITS[h]}-cent${r === 0 ? "s" : ""}`;
  return r === 0 ? centStr : `${centStr}-${belowHundred(r)}`;
}

export function nombreEnLettres(n: number): string {
  if (n === 0) return "zéro";
  const int = Math.floor(Math.abs(n));
  let result = "";
  if (int >= 1000) {
    const m = Math.floor(int / 1000);
    result += (m === 1 ? "mille" : `${belowThousand(m)}-mille`) + (int % 1000 === 0 ? "" : "-");
  }
  result += belowThousand(int % 1000);
  // Capitalize first letter
  result = result.replace(/^-/, "").replace(/-$/, "");
  return result.charAt(0).toUpperCase() + result.slice(1);
}

export function montantEnLettres(euros: number): string {
  const cents = Math.round((euros % 1) * 100);
  const e = Math.floor(euros);
  const eurosStr = `${nombreEnLettres(e)} euro${e > 1 ? "s" : ""}`;
  if (cents === 0) return eurosStr;
  return `${eurosStr} et ${nombreEnLettres(cents)} centime${cents > 1 ? "s" : ""}`;
}

// ── Formatage dates ───────────────────────────────────────────────────────────
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

export function formatDateFR(iso: string): string {
  const d = new Date(iso + "T12:00:00"); // évite les problèmes de timezone
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function addOneYear(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1); // fin = 1 jour avant l'anniversaire
  return d.toISOString().split("T")[0];
}

export function addOneYearExact(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

export function formatDateSlash(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// ── Niveau (étage) ────────────────────────────────────────────────────────────
export function formatNiveau(etage: number | null): string {
  if (etage === null || etage === undefined) return "";
  if (etage === 0) return "rez-de-chaussée";
  if (etage === 1) return "1er étage";
  return `${etage}ème étage`;
}
