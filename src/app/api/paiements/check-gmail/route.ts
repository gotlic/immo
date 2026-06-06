import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchSumeriaPayments } from "@/lib/gmail-imap";

export type GmailMatch = {
  // Info du mail Sumeria
  emailDate: string;       // ISO date
  emailAmount: number;
  emailLibelle: string;
  emailSender: string;
  // Info du paiement matché
  paiementId: number | null;
  bailId: number | null;
  mois: string;
  locataire: string;
  expectedMontant: number;
  // Résultat
  confidence: "confirmed" | "ambiguous";
  reason?: string;
};

/**
 * GET /api/paiements/check-gmail
 * Vérifie les règlements reçus via Sumeria (Compte 4 rue Flamen)
 * et les confronte aux paiements "attendu" en base.
 */
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  // Vérifier que les credentials Gmail sont configurés
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "GMAIL_USER et GMAIL_APP_PASSWORD ne sont pas configurés dans .env" },
      { status: 503 }
    );
  }

  // Chercher les mails Sumeria des 60 derniers jours
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

  // Récupérer tous les paiements "attendu" avec leurs baux
  const paiements = await prisma.paiement.findMany({
    where: { statut: "attendu" },
    include: {
      bail: {
        select: {
          id: true,
          prenomNom: true,
          appartement: { select: { titre: true, loyer: true, montantCharges: true } },
        },
      },
    },
  });

  const confirmed: GmailMatch[] = [];
  const ambiguous: GmailMatch[] = [];
  const noMatch: GmailMatch[] = [];

  for (const email of emails) {
    // Extraire l'année-mois du mail (ex: "2026-06")
    const emailMois = `${email.date.getFullYear()}-${String(email.date.getMonth() + 1).padStart(2, "0")}`;

    // Chercher des paiements dont le montant correspond exactement
    const exactMatches = paiements.filter((p) => p.montant === email.amount);
    // Chercher aussi dans le mois du mail ou le mois précédent (loyer souvent payé en avance)
    const prevMois = (() => {
      const d = new Date(email.date);
      d.setMonth(d.getMonth() - 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();

    const base: Omit<GmailMatch, "paiementId" | "bailId" | "mois" | "locataire" | "expectedMontant" | "confidence" | "reason"> = {
      emailDate: email.date.toISOString(),
      emailAmount: email.amount,
      emailLibelle: email.libelle,
      emailSender: email.sender,
    };

    if (exactMatches.length === 0) {
      // Aucun paiement en attente avec ce montant — peut-être déjà marqué payé ?
      noMatch.push({
        ...base,
        paiementId: null,
        bailId: null,
        mois: emailMois,
        locataire: email.sender,
        expectedMontant: email.amount,
        confidence: "ambiguous",
        reason: "Aucun paiement en attente avec ce montant",
      });
      continue;
    }

    // Parmi les exactMatches, favoriser ceux dont le mois correspond
    const moisMatches = exactMatches.filter((p) => p.mois === emailMois || p.mois === prevMois);

    if (moisMatches.length === 1) {
      // Match parfait : montant + mois unique
      confirmed.push({
        ...base,
        paiementId: moisMatches[0].id,
        bailId: moisMatches[0].bailId,
        mois: moisMatches[0].mois,
        locataire: moisMatches[0].bail.prenomNom ?? `Bail #${moisMatches[0].bailId}`,
        expectedMontant: moisMatches[0].montant,
        confidence: "confirmed",
      });
    } else if (exactMatches.length === 1) {
      // Montant unique mais mois ne correspond pas exactement
      ambiguous.push({
        ...base,
        paiementId: exactMatches[0].id,
        bailId: exactMatches[0].bailId,
        mois: exactMatches[0].mois,
        locataire: exactMatches[0].bail.prenomNom ?? `Bail #${exactMatches[0].bailId}`,
        expectedMontant: exactMatches[0].montant,
        confidence: "ambiguous",
        reason: `Le mois du mail (${emailMois}) ne correspond pas au mois attendu (${exactMatches[0].mois})`,
      });
    } else {
      // Plusieurs paiements avec le même montant — ambigu
      ambiguous.push({
        ...base,
        paiementId: moisMatches[0]?.id ?? exactMatches[0].id,
        bailId: moisMatches[0]?.bailId ?? exactMatches[0].bailId,
        mois: moisMatches[0]?.mois ?? exactMatches[0].mois,
        locataire: (moisMatches[0] ?? exactMatches[0]).bail.prenomNom ?? "?",
        expectedMontant: (moisMatches[0] ?? exactMatches[0]).montant,
        confidence: "ambiguous",
        reason: `${exactMatches.length} paiements avec ce montant (${email.amount} €)`,
      });
    }
  }

  return NextResponse.json({ confirmed, ambiguous, noMatch });
}

/**
 * POST /api/paiements/check-gmail
 * Body: { paiementIds: number[], datePaiement: string }
 * Marque les paiements donnés comme "paye".
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { paiementIds, datePaiement } = await req.json() as {
    paiementIds: number[];
    datePaiement: string;
  };

  if (!Array.isArray(paiementIds) || paiementIds.length === 0) {
    return NextResponse.json({ error: "paiementIds requis" }, { status: 400 });
  }

  await prisma.paiement.updateMany({
    where: { id: { in: paiementIds } },
    data: {
      statut: "paye",
      datePaiement: datePaiement ?? new Date().toISOString().slice(0, 10),
    },
  });

  return NextResponse.json({ ok: true, updated: paiementIds.length });
}
