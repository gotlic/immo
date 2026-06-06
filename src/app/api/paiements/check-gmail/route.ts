import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSumeriaPayments } from "@/lib/gmail-imap";

export type GmailMatch = {
  emailDate: string;
  emailAmount: number;
  emailLibelle: string;
  emailSender: string;
  // clé pour valider : bailId + mois (pas de paiementId car la ligne peut ne pas exister)
  bailId: number;
  mois: string;
  locataire: string;
  expectedMontant: number;
  existingPaiementId: number | null;  // null = pas encore de ligne en DB
  confidence: "confirmed" | "ambiguous";
  reason?: string;
};

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "GMAIL_USER et GMAIL_APP_PASSWORD ne sont pas configurés dans .env" },
      { status: 503 }
    );
  }

  // Récupérer les mails Sumeria des 60 derniers jours
  const since = new Date();
  since.setDate(since.getDate() - 60);

  let emails;
  try {
    emails = await fetchSumeriaPayments(since);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Erreur Gmail : ${message}` }, { status: 500 });
  }

  if (emails.length === 0) {
    return NextResponse.json({ confirmed: [], ambiguous: [], noMatch: [] });
  }

  // Récupérer tous les baux actifs avec leurs montants
  const baux = await prisma.bail.findMany({
    where: { status: "signed_both", archived: false },
    select: {
      id: true,
      prenomNom: true,
      dateDebut: true,
      appartement: { select: { loyer: true, montantCharges: true } },
    },
  });

  // Récupérer les paiements déjà existants (pour éviter les doublons et pour avoir l'id)
  const existingPaiements = await prisma.paiement.findMany({
    select: { id: true, bailId: true, mois: true, statut: true },
  });

  const confirmed: GmailMatch[] = [];
  const ambiguous: GmailMatch[] = [];
  const noMatch: GmailMatch[] = [];

  for (const email of emails) {
    const emailMois = `${email.date.getFullYear()}-${String(email.date.getMonth() + 1).padStart(2, "0")}`;
    // Le loyer peut arriver le mois précédent (payé en avance) ou le mois courant
    const nextMois = (() => {
      const d = new Date(email.date);
      d.setMonth(d.getMonth() + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();

    const base = {
      emailDate: email.date.toISOString(),
      emailAmount: email.amount,
      emailLibelle: email.libelle,
      emailSender: email.sender,
    };

    // Trouver les baux dont le total (loyer + charges) correspond exactement au montant reçu
    const matchingBaux = baux.filter((b) => {
      const total = (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0);
      return Math.abs(total - email.amount) < 0.01;
    });

    if (matchingBaux.length === 0) {
      noMatch.push({
        ...base,
        bailId: 0,
        mois: emailMois,
        locataire: email.sender,
        expectedMontant: email.amount,
        existingPaiementId: null,
        confidence: "ambiguous",
        reason: "Aucun bail actif avec ce montant de loyer CC",
      });
      continue;
    }

    // Pour chaque bail matchant, déterminer le mois cible et vérifier si déjà payé
    // Le mois cible : emailMois si le loyer est payé en cours de mois,
    // ou nextMois si payé en avance (avant le 5 du mois)
    const emailDay = email.date.getDate();
    const targetMois = emailDay <= 5 ? nextMois : emailMois;

    // Filtrer les baux pour lesquels ce mois n'est pas déjà payé
    const unpaidBaux = matchingBaux.filter((b) => {
      const existing = existingPaiements.find(
        (p) => p.bailId === b.id && p.mois === targetMois
      );
      return !existing || existing.statut !== "paye";
    });

    if (unpaidBaux.length === 0) {
      // Tout est déjà payé — on skip silencieusement (déjà traité)
      continue;
    }

    if (unpaidBaux.length === 1) {
      const b = unpaidBaux[0];
      const existing = existingPaiements.find(
        (p) => p.bailId === b.id && p.mois === targetMois
      );
      confirmed.push({
        ...base,
        bailId: b.id,
        mois: targetMois,
        locataire: b.prenomNom ?? `Bail #${b.id}`,
        expectedMontant: (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0),
        existingPaiementId: existing?.id ?? null,
        confidence: "confirmed",
      });
    } else {
      // Plusieurs baux avec le même montant — ambigu
      const b = unpaidBaux[0];
      const existing = existingPaiements.find(
        (p) => p.bailId === b.id && p.mois === targetMois
      );
      ambiguous.push({
        ...base,
        bailId: b.id,
        mois: targetMois,
        locataire: b.prenomNom ?? `Bail #${b.id}`,
        expectedMontant: (b.appartement.loyer ?? 0) + (b.appartement.montantCharges ?? 0),
        existingPaiementId: existing?.id ?? null,
        confidence: "ambiguous",
        reason: `${unpaidBaux.length} baux ont le même montant de loyer (${email.amount} €)`,
      });
    }
  }

  return NextResponse.json({ confirmed, ambiguous, noMatch });
}

/**
 * POST /api/paiements/check-gmail
 * Body: { matches: { bailId, mois, existingPaiementId, montant, datePaiement }[] }
 * Crée ou met à jour les paiements en "paye".
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { matches } = await req.json() as {
    matches: {
      bailId: number;
      mois: string;
      existingPaiementId: number | null;
      montant: number;
      datePaiement: string;
    }[];
  };

  if (!Array.isArray(matches) || matches.length === 0) {
    return NextResponse.json({ error: "matches requis" }, { status: 400 });
  }

  let updated = 0;
  let created = 0;

  for (const m of matches) {
    if (m.existingPaiementId) {
      await prisma.paiement.update({
        where: { id: m.existingPaiementId },
        data: { statut: "paye", datePaiement: m.datePaiement },
      });
      updated++;
    } else {
      await prisma.paiement.create({
        data: {
          bailId: m.bailId,
          mois: m.mois,
          montant: m.montant,
          statut: "paye",
          datePaiement: m.datePaiement,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ ok: true, updated, created });
}
