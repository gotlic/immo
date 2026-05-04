import { NextResponse } from "next/server";

// Série INSEE 001515333 : Indice de Référence des Loyers (IRL)
// API publique BDM INSEE — pas de clé requise
const INSEE_URL =
  "https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/001515333";

function convertQuarter(timePeriod: string): string {
  // "2026-Q1" → "T1 2026"
  const m = timePeriod.match(/^(\d{4})-Q([1-4])$/);
  if (m) return `T${m[2]} ${m[1]}`;
  return timePeriod;
}

export async function GET() {
  try {
    const res = await fetch(INSEE_URL, {
      headers: { Accept: "application/xml" },
      next: { revalidate: 86400 }, // cache 24h
    });

    if (res.ok) {
      const xml = await res.text();
      // Extraire le premier Obs (le plus récent)
      const match = xml.match(/<Obs\s[^>]*TIME_PERIOD="([^"]+)"[^>]*OBS_VALUE="([^"]+)"/);
      if (match) {
        return NextResponse.json({
          trimestre: convertQuarter(match[1]),
          valeur: match[2],
          source: "insee.fr BDM",
        });
      }
    }

    return NextResponse.json({ error: "IRL indisponible", trimestre: null, valeur: null });
  } catch {
    return NextResponse.json({ error: "Erreur réseau", trimestre: null, valeur: null });
  }
}
