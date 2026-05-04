import { NextRequest, NextResponse } from "next/server";

// Rue Flamen, Lille → Zone 3 (confirmé par les valeurs 18,70 / 22,40 de l'arrêté 2023)
const ZONE = 3;
const ANNEE_CONSTRUCTION = "avant 1946";

// Dataset data.gouv.fr — "Encadrement des loyers de Lille"
// L'URL de l'API redirige vers la dernière version disponible du fichier
const DATAGOUV_RESOURCE_URL =
  "https://www.data.gouv.fr/api/1/datasets/r/4a59cae3-8da0-4ab1-8942-936e1002101d";

// Extrait l'année de l'arrêté depuis l'URL du fichier (ex. "encadrements-lille-2023.json" → 2023)
function extractAnneeArrete(url: string): number | null {
  const m = url.match(/encadrements-lille-(\d{4})\.json/i);
  return m ? parseInt(m[1]) : null;
}

function parseDecimal(v: string | number): number {
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(",", "."));
}

// GET /api/encadrement?nbPieces=1
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nbPiecesRaw = parseInt(searchParams.get("nbPieces") ?? "1");
  const nbPieces = isNaN(nbPiecesRaw) || nbPiecesRaw < 1 ? 1 : nbPiecesRaw;

  // Le dataset encode "4 et plus" pour >= 4 pièces
  const nbPiecesKey: number | string = nbPieces >= 4 ? "4 et plus" : nbPieces;

  try {
    // Résoudre la redirection pour récupérer l'URL finale (contient l'année)
    const headRes = await fetch(DATAGOUV_RESOURCE_URL, { method: "HEAD", redirect: "follow" });
    const finalUrl = headRes.url || DATAGOUV_RESOURCE_URL;
    const anneeArrete = extractAnneeArrete(finalUrl);

    // Télécharger les données
    const dataRes = await fetch(finalUrl, {
      next: { revalidate: 86400 }, // cache 24 h
    });
    if (!dataRes.ok) throw new Error(`HTTP ${dataRes.status}`);

    const rows: Array<{
      zone: number;
      meuble: boolean;
      annee_de_construction: string;
      nombre_de_piece: number | string;
      prix_med: string | number;
      prix_max: string | number;
      prix_min: string | number;
    }> = await dataRes.json();

    const entry = rows.find(
      (r) =>
        r.zone === ZONE &&
        r.meuble === true &&
        r.annee_de_construction === ANNEE_CONSTRUCTION &&
        r.nombre_de_piece === nbPiecesKey,
    );

    if (!entry) {
      return NextResponse.json(
        { error: `Aucune entrée pour Zone ${ZONE}, ${ANNEE_CONSTRUCTION}, meublé, ${nbPiecesKey} pièce(s)` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      reference: parseDecimal(entry.prix_med).toFixed(1),
      majore:    parseDecimal(entry.prix_max).toFixed(1),
      minore:    parseDecimal(entry.prix_min).toFixed(1),
      zone:              ZONE,
      anneeConstruction: ANNEE_CONSTRUCTION,
      meuble:            true,
      nbPieces,
      anneeArrete,           // année de l'arrêté déduite du nom de fichier (ex. 2023)
      source: "data.gouv.fr — Encadrement des loyers de Lille",
    });
  } catch (err) {
    console.error("[GET /api/encadrement]", err);
    return NextResponse.json({ error: "Données indisponibles" }, { status: 500 });
  }
}
