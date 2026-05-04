/** Convertit un entier en toutes lettres (français) */

const UNITS = [
  "", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7) {
    return u === 0 ? "soixante-dix"
      : u === 1 ? "soixante-et-onze"
      : `soixante-${UNITS[10 + u]}`;
  }
  if (t === 8) {
    return u === 0 ? "quatre-vingts" : `quatre-vingt-${UNITS[u]}`;
  }
  if (t === 9) {
    return u === 0 ? "quatre-vingt-dix" : `quatre-vingt-${UNITS[10 + u]}`;
  }
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante"];
  if (u === 0) return tens[t];
  if (u === 1 && t !== 8) return `${tens[t]}-et-un`;
  return `${tens[t]}-${UNITS[u]}`;
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const centStr = h === 1 ? "cent" : `${UNITS[h]} cent`;
  if (r === 0) return h === 1 ? "cent" : `${UNITS[h]} cents`;
  return `${centStr} ${below100(r)}`;
}

export function numberToFrench(n: number): string {
  n = Math.round(n);
  if (n === 0) return "zéro";
  if (n < 0) return `moins ${numberToFrench(-n)}`;
  if (n < 1000) return below1000(n);
  if (n < 1_000_000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    const thousandStr = thousands === 1 ? "mille" : `${below1000(thousands)} mille`;
    return remainder === 0 ? thousandStr : `${thousandStr} ${below1000(remainder)}`;
  }
  return n.toLocaleString("fr-FR"); // fallback
}
