import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "Missing q" }, { status: 400 });

  try {
    // 1. Essai avec l'API Adresse française (plus précise pour la France)
    const frRes = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=1`,
      { next: { revalidate: 86400 } }
    );
    if (frRes.ok) {
      const frData = await frRes.json();
      if (frData.features?.length) {
        const [lon, lat] = frData.features[0].geometry.coordinates as [number, number];
        return NextResponse.json({ lat, lon, displayName: frData.features[0].properties.label });
      }
    }

    // 2. Fallback Nominatim (international)
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "site-immo-lictevout/1.0 (gautier@lictevout.com)" },
        next: { revalidate: 86400 },
      }
    );
    if (nomRes.ok) {
      const nomData = await nomRes.json();
      if (nomData.length) {
        return NextResponse.json({
          lat: parseFloat(nomData[0].lat),
          lon: parseFloat(nomData[0].lon),
          displayName: nomData[0].display_name,
        });
      }
    }

    return NextResponse.json({ error: "Adresse introuvable" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Erreur réseau" }, { status: 502 });
  }
}
