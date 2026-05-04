import { NextRequest, NextResponse } from "next/server";

// API Adresse — service officiel de géocodage français (data.gouv.fr)
// Gratuit, sans clé, couverture France entière
// https://adresse.data.gouv.fr/api-doc/adresse

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 5) {
    return NextResponse.json({ valid: false, label: null, score: 0 });
  }

  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=3&autocomplete=0`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) return NextResponse.json({ valid: false, error: "API indisponible" });

    const data = await res.json();
    const features: {
      properties: { score: number; label: string; postcode?: string; city?: string };
      geometry: { coordinates: [number, number] };
    }[] = data.features ?? [];

    if (!features.length) {
      return NextResponse.json({ valid: false, label: null, score: 0 });
    }

    const best = features[0];
    const score: number = best.properties.score;

    return NextResponse.json({
      valid: score >= 0.5,
      score: Math.round(score * 100),
      label: best.properties.label,        // adresse normalisée
      postcode: best.properties.postcode,
      city: best.properties.city,
      coordinates: best.geometry.coordinates, // [lon, lat]
      suggestions: features.slice(0, 3).map((f) => f.properties.label),
    });
  } catch {
    return NextResponse.json({ valid: false, error: "Erreur réseau" });
  }
}
